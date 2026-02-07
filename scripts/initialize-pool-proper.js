const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 PROPERLY INITIALIZING AED/INR POOL\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';
  
  // Sort tokens (AED < INR alphabetically)
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;

  console.log('Pool Configuration:');
  console.log('  Token0:', token0);
  console.log('  Token1:', token1);
  console.log('  Fee:', fee, '(0.3%)');
  console.log('  Tick Spacing:', tickSpacing);
  console.log('  Hooks:', hooks);

  // Price: 1 AED = 22.727 INR
  // sqrtPriceX96 = sqrt(22.727) * 2^96 = 377680650705498097308424011251
  const sqrtPriceX96 = '377680650705498097308424011251';
  console.log('  Initial sqrtPriceX96:', sqrtPriceX96);

  // CORRECTED: Pass pool key as tuple/array, not object
  const poolManager = new ethers.Contract(
    POOL_MANAGER,
    [
      'function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint160 sqrtPriceX96, bytes hookData) returns (int24)'
    ],
    signer
  );

  // Pass as array matching struct order
  const poolKey = [token0, token1, fee, tickSpacing, hooks];

  console.log('\n⏱️  Estimating gas...');
  try {
    const gasEstimate = await poolManager.initialize.estimateGas(
      poolKey,
      sqrtPriceX96,
      '0x'
    );
    console.log('✅ Gas estimate:', gasEstimate.toString());

    console.log('\n📤 Sending initialization transaction...');
    const tx = await poolManager.initialize(
      poolKey,
      sqrtPriceX96,
      '0x',
      { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
    );

    console.log('✅ Transaction sent!');
    console.log('   Hash:', tx.hash);
    console.log('   🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    console.log('\n⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('\n🎉 POOL INITIALIZED SUCCESSFULLY!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');

    // Check for Initialize event
    const initTopic = ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
    const initEvents = receipt.logs.filter(log => log.topics[0] === initTopic);
    
    if (initEvents.length > 0) {
      console.log('\n✅ Initialize event confirmed!');
      console.log('   Pool ID:', initEvents[0].topics[1]);
    }

    // Verify pool state
    const poolManagerRead = new ethers.Contract(
      POOL_MANAGER,
      ['function extsload(bytes32 slot) view returns (bytes32)'],
      signer
    );

    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        poolKey
      )
    );

    console.log('\n🔍 Verifying pool state...');
    const slot = await poolManagerRead.extsload(poolId);
    console.log('   Pool storage:', slot);
    
    if (slot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('   ✅ Pool state is non-zero - SUCCESSFULLY INITIALIZED!');
    } else {
      console.log('   ⚠️  Pool state still zero - something went wrong');
    }

    console.log('\n✅ Pool is now ready for liquidity!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: node scripts/add-more-liquidity.js');
    console.log('   2. Refresh your frontend');
    console.log('   3. V4 quotes should now work!');

  } catch (error) {
    console.log('\n❌ Initialization failed!');
    console.log('Error:', error.message);

    if (error.message.includes('require(false)')) {
      console.log('\n💡 This suggests Base Sepolia blocks direct initialization.');
      console.log('We may need to use a different contract or approach.');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
