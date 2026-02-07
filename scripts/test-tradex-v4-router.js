const { ethers } = require('hardhat');

async function main() {
  console.log('🔄 TESTING V4 SWAP with TradeXV4Router\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  // Our deployed TradeXV4Router (points to official PoolManager 0x05E7...)
  const ROUTER = '0xc9dF04D06bd7251A413c2d4D2cD4bF773983CC49';
  const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
  
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';

  // Sort tokens
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];

  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  console.log('Pool Key:');
  console.log('  currency0:', token0);
  console.log('  currency1:', token1);
  console.log('  fee: 3000, tickSpacing: 60');

  // First check: Is this pool initialized on the OFFICIAL PoolManager?
  console.log('\n📊 Checking official PoolManager for pool state...');
  
  const poolManagerABI = [
    'function getSlot0(bytes32) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32) external view returns (uint128)',
    'function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)'
  ];

  const pm = new ethers.Contract(POOL_MANAGER, poolManagerABI, signer);
  
  // Compute pool ID
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    )
  );
  console.log('  Pool ID:', poolId);

  try {
    const slot0 = await pm.getSlot0(poolId);
    console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
    console.log('  tick:', slot0.tick.toString());
    
    if (slot0.sqrtPriceX96 === 0n) {
      console.log('\n⚠️ Pool NOT initialized on official PoolManager!');
      console.log('   Need to initialize it first...');
      
      // Initialize the pool: 1 AED = 22.727 INR → sqrtPriceX96
      const sqrtPriceX96 = 377680650705498097308424011251n;
      console.log('\n🎯 Initializing pool on official PoolManager...');
      console.log('   sqrtPriceX96:', sqrtPriceX96.toString());
      
      try {
        const initTx = await pm.initialize(poolKey, sqrtPriceX96);
        console.log('   Init tx:', initTx.hash);
        const receipt = await initTx.wait();
        console.log('   ✅ Pool initialized! Block:', receipt.blockNumber);
      } catch (initErr) {
        console.log('   ❌ Init failed:', initErr.message);
        console.log('\n   The official PoolManager may restrict initialization.');
        console.log('   Will try deploying router to alternative PoolManager instead.');
        return 'NEED_ALT_DEPLOYMENT';
      }

      // Check again
      const slot0After = await pm.getSlot0(poolId);
      console.log('   New sqrtPriceX96:', slot0After.sqrtPriceX96.toString());
    } else {
      console.log('  ✅ Pool already initialized on official PoolManager!');
    }
  } catch (e) {
    console.log('  ❌ Error reading pool state:', e.message);
    return 'NEED_ALT_DEPLOYMENT';
  }

  // If we get here, pool is initialized on official PM
  // Now add liquidity via our router
  console.log('\n💰 Adding liquidity via TradeXV4Router...');
  
  const router = new ethers.Contract(
    ROUTER,
    [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable',
      'function addLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable',
    ],
    signer
  );

  const erc20ABI = [
    'function approve(address, uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
  ];

  const aedToken = new ethers.Contract(AED, erc20ABI, signer);
  const inrToken = new ethers.Contract(INR, erc20ABI, signer);

  // Approve tokens to router
  const approveAmount = ethers.parseUnits('10000', 6);
  console.log('  Approving AED...');
  await (await aedToken.approve(ROUTER, approveAmount)).wait();
  console.log('  Approving INR...');
  await (await inrToken.approve(ROUTER, approveAmount)).wait();
  console.log('  ✅ Approved');

  // Add liquidity
  const liquidityDelta = 1000000000n; // 1B liquidity units
  console.log('  Adding liquidity:', liquidityDelta.toString());

  try {
    const liqTx = await router.addLiquidity(
      poolKey,
      {
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: liquidityDelta,
        salt: ethers.ZeroHash
      },
      '0x',
      { gasLimit: 500000 }
    );

    console.log('  Liq tx:', liqTx.hash);
    const liqReceipt = await liqTx.wait();
    console.log('  ✅ Liquidity added! Block:', liqReceipt.blockNumber);
    console.log('  🔗 https://sepolia.basescan.org/tx/' + liqTx.hash);
    
  } catch (liqErr) {
    console.log('  ❌ Liquidity failed:', liqErr.message);
  }

  // Now test swap: 1 INR → AED
  console.log('\n💱 Testing swap: 1 INR → AED');
  const swapAmount = ethers.parseUnits('1', 6);

  try {
    const MIN_SQRT_PRICE = 4295128739n + 1n; // Minimum price for !zeroForOne
    
    const swapTx = await router.swap(
      poolKey,
      {
        zeroForOne: false, // INR → AED (token1 → token0)
        amountSpecified: -BigInt(swapAmount), // Negative = exact input
        sqrtPriceLimitX96: MIN_SQRT_PRICE
      },
      '0x',
      { gasLimit: 300000 }
    );

    console.log('  Swap tx:', swapTx.hash);
    console.log('  🔗 https://sepolia.basescan.org/tx/' + swapTx.hash);
    
    const swapReceipt = await swapTx.wait();
    console.log('\n✅ SWAP SUCCESSFUL!');
    console.log('   Block:', swapReceipt.blockNumber);
    console.log('   Gas used:', swapReceipt.gasUsed.toString());
    console.log('   Events:', swapReceipt.logs.length);

    // Check balances
    const aedBal = await aedToken.balanceOf(signer.address);
    const inrBal = await inrToken.balanceOf(signer.address);
    console.log('\n💰 Balances after swap:');
    console.log('  AED:', ethers.formatUnits(aedBal, 6));
    console.log('  INR:', ethers.formatUnits(inrBal, 6));
    
    console.log('\n🎉 TradeXV4Router swap works! Transaction hash available!');

  } catch (swapErr) {
    console.log('  ❌ Swap failed:', swapErr.message);
  }
}

main()
  .then((result) => {
    if (result === 'NEED_ALT_DEPLOYMENT') {
      console.log('\n⚠️ Need to deploy TradeXV4Router with alternative PoolManager');
      console.log('   Alternative PM: 0x1b832D5395A41446b508632466cf32c6C07D63c7');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
