const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 INITIALIZING AED/INR POOL ON BASE SEPOLIA (Alternative V4)\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  // Alternative V4 deployment on Base Sepolia
  const POOL_MANAGER = '0x1b832D5395A41446b508632466cf32c6C07D63c7';
  const ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';
  
  // Your tokens
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';

  // Sort tokens
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const isAEDToken0 = token0 === AED;

  console.log('Pool Configuration:');
  console.log('  Token0:', token0, isAEDToken0 ? '(AED)' : '(INR)');
  console.log('  Token1:', token1, isAEDToken0 ? '(INR)' : '(AED)');
  console.log('  Fee: 3000 (0.3%)');
  console.log('  Tick Spacing: 60');

  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;

  // Price: 1 AED = 22.727 INR
  // sqrtPriceX96 = sqrt(22.727) * 2^96 for AED as token0
  // sqrtPriceX96 = sqrt(1/22.727) * 2^96 for INR as token0
  const sqrtPriceX96 = isAEDToken0
    ? '377680650705498097308424011251'
    : '16612068664016978285223648916';

  console.log('  Initial sqrtPriceX96:', sqrtPriceX96);

  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: fee,
    tickSpacing: tickSpacing,
    hooks: hooks
  };

  // Check if pool exists
  console.log('\n🔍 Checking pool status...');
  const router = new ethers.Contract(
    ROUTER,
    [
      'function getPoolStatus((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (uint160 sqrtPriceX96, uint128 liquidity)'
    ],
    signer
  );

  const status = await router.getPoolStatus(poolKey);
  console.log('  Current sqrtPriceX96:', status.sqrtPriceX96.toString());
  console.log('  Current liquidity:', status.liquidity.toString());

  if (status.sqrtPriceX96 === 0n) {
    console.log('  ❌ Pool not initialized\n');

    // Initialize pool
    console.log('📤 Initializing pool via PoolManager...');
    const manager = new ethers.Contract(
      POOL_MANAGER,
      [
        'function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24)'
      ],
      signer
    );

    try {
      const gasEstimate = await manager.initialize.estimateGas(poolKey, sqrtPriceX96);
      console.log('  Gas estimate:', gasEstimate.toString());

      const tx = await manager.initialize(poolKey, sqrtPriceX96, {
        gasLimit: gasEstimate * 120n / 100n
      });

      console.log('  Transaction:', tx.hash);
      console.log('  🔗 https://sepolia.basescan.org/tx/' + tx.hash);
      console.log('  ⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('\n✅ Pool initialized!');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
      console.log('   Events:', receipt.logs.length);

      // Verify
      const newStatus = await router.getPoolStatus(poolKey);
      console.log('\n📊 New pool status:');
      console.log('   sqrtPriceX96:', newStatus.sqrtPriceX96.toString());
      console.log('   liquidity:', newStatus.liquidity.toString());

      if (newStatus.sqrtPriceX96 !== 0n) {
        console.log('   ✅ Pool successfully initialized!');
      } else {
        console.log('   ⚠️  Pool state still zero');
      }

    } catch (error) {
      console.log('  ❌ Initialization failed:', error.message);
      
      if (error.message.includes('PoolAlreadyInitialized')) {
        console.log('  ℹ️  Pool already exists!');
      }
    }

  } else {
    console.log('  ✅ Pool already initialized!\n');
  }

  console.log('\n💡 Next step: Run add-liquidity-alt-base.js to add liquidity');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
