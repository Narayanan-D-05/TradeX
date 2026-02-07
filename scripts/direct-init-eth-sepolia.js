const { ethers } = require('hardhat');

async function main() {
  console.log('🔧 DIRECT POOLMANAGER INITIALIZATION (ETHEREUM SEPOLIA)\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543';
  const AED = '0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c';
  const INR = '0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41';

  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;
  const sqrtPriceX96 = '377680650705498097308424011251';

  console.log('Pool Configuration:');
  console.log('  Token0 (AED):', token0);
  console.log('  Token1 (INR):', token1);
  console.log('  Fee:', fee);
  console.log('  Tick Spacing:', tickSpacing);
  console.log('  sqrtPriceX96:', sqrtPriceX96);

  const poolManager = new ethers.Contract(
    POOL_MANAGER,
    [
      'function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint160 sqrtPriceX96, bytes hookData) returns (int24)'
    ],
    signer
  );

  const poolKey = [token0, token1, fee, tickSpacing, hooks];

  console.log('\n⏱️  Testing PoolManager.initialize() directly...');
  console.log('Pool key:', poolKey);

  try {
    // Try with staticCall first (simulation)
    console.log('\n🧪 Step 1: Static call (simulation)...');
    const result = await poolManager.initialize.staticCall(poolKey, sqrtPriceX96, '0x');
    console.log('✅ Static call succeeded! Returned tick:', result.toString());

    // Now do actual transaction
    console.log('\n📤 Step 2: Sending actual transaction...');
    const gasEstimate = await poolManager.initialize.estimateGas(poolKey, sqrtPriceX96, '0x');
    console.log('  Gas estimate:', gasEstimate.toString());

    const tx = await poolManager.initialize(poolKey, sqrtPriceX96, '0x', {
      gasLimit: gasEstimate * 120n / 100n
    });

    console.log('  Transaction:', tx.hash);
    console.log('  🔗 https://sepolia.etherscan.io/tx/' + tx.hash);
    console.log('  ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('\n✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   Status:', receipt.status === 1 ? 'Success' : 'Failed');
    console.log('   Events:', receipt.logs.length);

    // Check for Initialize event
    const initTopic = ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
    const initEvents = receipt.logs.filter(log => log.topics[0] === initTopic);

    if (initEvents.length > 0) {
      console.log('\n🎉 Initialize event found!');
      console.log('   Pool ID:', initEvents[0].topics[1]);
      console.log('   ✅ POOL SUCCESSFULLY INITIALIZED!');

      // Verify pool state
      const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint24', 'int24', 'address'],
          poolKey
        )
      );

      const poolManagerRead = new ethers.Contract(
        POOL_MANAGER,
        ['function extsload(bytes32 slot) view returns (bytes32)'],
        signer
      );

      const slot = await poolManagerRead.extsload(poolId);
      console.log('\n📊 Pool storage:', slot);

      if (slot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('✅ Pool state is non-zero - CONFIRMED INITIALIZED!');
        
        console.log('\n💡 Next step: Run add liquidity script');
        console.log('   node scripts/add-liquidity-eth-sepolia.js');
      }

    } else {
      console.log('\n⚠️  No Initialize event emitted');
      console.log('Transaction succeeded but pool may not be initialized');
    }

  } catch (error) {
    console.log('\n❌ Failed:', error.message);

    if (error.message.includes('PoolAlreadyInitialized')) {
      console.log('\n✅ Pool already exists! This is actually good news.');
      console.log('💡 Run: node scripts/add-liquidity-eth-sepolia.js');
    } else if (error.message.includes('require(false)')) {
      console.log('\n💡 Direct initialization is blocked.');
      console.log('   This testnet deployment may restrict who can initialize pools.');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
