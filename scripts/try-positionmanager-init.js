const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 CHECKING POSITIONMANAGER FOR INITIALIZATION\n');

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  const POSITION_MANAGER = '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';

  // Check contract code
  const code = await provider.getCode(POSITION_MANAGER);
  console.log('✅ PositionManager exists:', code.length > 2);

  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;
  const sqrtPriceX96 = '377680650705498097308424011251';

  console.log('\n📋 Pool Configuration:');
  console.log('  Token0:', token0);
  console.log('  Token1:', token1);  
  console.log('  Fee:', fee);
  console.log('  sqrtPriceX96:', sqrtPriceX96);

  // Try PositionManager.initializePool()
  console.log('\n🧪 Method 1: PositionManager.initializePool()');
  try {
    const positionManager = new ethers.Contract(
      POSITION_MANAGER,
      [
        'function initializePool((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint160 sqrtPriceX96) payable returns (int24 tick)'
      ],
      signer
    );

    const poolKey = [token0, token1, fee, tickSpacing, hooks];
    
    const gasEstimate = await positionManager.initializePool.estimateGas(poolKey, sqrtPriceX96);
    console.log('✅ Gas estimate:', gasEstimate.toString());
    
    console.log('📤 Sending transaction...');
    const tx = await positionManager.initializePool(poolKey, sqrtPriceX96, {
      gasLimit: gasEstimate * 120n / 100n
    });

    console.log('   Hash:', tx.hash);
    console.log('   🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    
    const receipt = await tx.wait();
    console.log('\n✅ SUCCESS!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());

    return;

  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Try PositionManager.mint() with initialization
  console.log('\n🧪 Method 2: PositionManager.modifyLiquidities() with INITIALIZE action');
  try {
    const positionManager = new ethers.Contract(
      POSITION_MANAGER,
      [
        'function modifyLiquidities(bytes unlockData, uint256 deadline) payable'
      ],
      signer
    );

    // Check token balances
    const aedToken = new ethers.Contract(AED, ['function balanceOf(address) view returns (uint256)'], signer);
    const inrToken = new ethers.Contract(INR, ['function balanceOf(address) view returns (uint256)'], signer);
    
    const aedBalance = await aedToken.balanceOf(signer.address);
    const inrBalance = await inrToken.balanceOf(signer.address);
    
    console.log('   AED balance:', ethers.formatUnits(aedBalance, 6));
    console.log('   INR balance:', ethers.formatUnits(inrBalance, 6));

    if (aedBalance < 10n * 10n**6n) {
      console.log('❌ Insufficient AED balance for initialization');
      return;
    }

    console.log('   (Would require encoding complex calldata - skipping for now)');

  } catch (error) {
    console.log('❌ Method requires complex encoding');
  }

  // Check if pool can be initialized via Quoter as a simulation
  console.log('\n🧪 Method 3: Check Quoter for clues');
  const QUOTER = '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba';
  const quoter = new ethers.Contract(
    QUOTER,
    ['function quoteExactInputSingle((address,address,uint24,int24,address) key, uint128 amountIn, uint160 sqrtPriceLimitX96, bytes hookData) returns (uint256 amountOut, uint256 gasEstimate)'],
    signer
  );

  try {
    const poolKey = [token0, token1, fee, tickSpacing, hooks];
    const result = await quoter.quoteExactInputSingle(
      poolKey,
      1000000n, // 1 token
      0n,
      '0x'
    );
    console.log('❌ Quoter should fail if pool not initialized, but returned:', result);
  } catch (error) {
    console.log('✅ Quoter correctly fails (pool not initialized):', error.message.slice(0, 80));
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. If Method 1 worked: You can use PositionManager.initializePool()');
  console.log('2. If both failed: Base Sepolia may require special permissions for initialization');
  console.log('3. Alternative: Deploy your own PoolManager for testing with v4-core contracts');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
