const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 VERIFYING POOL ID AND INITIALIZING\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';
  
  // Sort tokens
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  console.log('Token0 (lower):', token0);
  console.log('Token1 (higher):', token1);

  // Pool parameters
  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;

  // Calculate pool ID using correct method
  const poolKeyEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [token0, token1, fee, tickSpacing, hooks]
  );
  const poolId = ethers.keccak256(poolKeyEncoded);
  console.log('\n📋 Calculated Pool ID:', poolId);
  console.log('   Expected Pool ID:  0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281');
  console.log('   ✅ MATCH:', poolId === '0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281');

  // Check pool state
  const poolManager = new ethers.Contract(
    POOL_MANAGER,
    ['function extsload(bytes32 slot) view returns (bytes32)'],
    signer
  );

  const slot = await poolManager.extsload(poolId);
  console.log('\n📊 Pool storage slot:', slot);
  
  if (slot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.log('❌ Pool is NOT initialized (all zeros)\n');
    console.log('🔧 Attempting to initialize pool...\n');

    // Use UniversalRouter to initialize
    const UNIVERSAL_ROUTER = '0x492e6456d9528771018deb9e87ef7750ef184104';
    
    // Price: 1 AED = 22.727 INR
    // sqrtPriceX96 = sqrt(22.727) * 2^96 = 377680650705498097308424011251
    const sqrtPriceX96 = '377680650705498097308424011251';

    // Try direct initialization with PoolManager
    const poolManagerWithInit = new ethers.Contract(
      POOL_MANAGER,
      [
        'function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96, bytes hookData) returns (int24)'
      ],
      signer
    );

    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: hooks
    };

    console.log('Pool Key:', poolKey);
    console.log('sqrtPriceX96:', sqrtPriceX96);

    try {
      // Estimate gas first
      console.log('\n⏱️  Estimating gas...');
      const gasEstimate = await poolManagerWithInit.initialize.estimateGas(
        poolKey,
        sqrtPriceX96,
        '0x'
      );
      console.log('✅ Gas estimate:', gasEstimate.toString());

      // Send transaction
      console.log('\n📤 Initializing pool...');
      const tx = await poolManagerWithInit.initialize(
        poolKey,
        sqrtPriceX96,
        '0x',
        { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
      );

      console.log('Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Pool initialized!');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());

      // Verify initialization
      const newSlot = await poolManager.extsload(poolId);
      console.log('\n✅ New pool storage slot:', newSlot);
      console.log(newSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? '   ✅ Pool is now initialized!' : '   ❌ Still not initialized');

    } catch (error) {
      console.log('❌ Initialization failed:', error.message);
      
      if (error.message.includes('require(false)')) {
        console.log('\n💡 Direct initialization blocked on Base Sepolia.');
        console.log('The PoolModifyLiquidityTest approach we used before also didn\'t work.');
        console.log('\n🔍 Let me check what actually happened in our previous transactions...');
      }
    }

  } else {
    console.log('✅ Pool IS initialized! Storage:', slot);
  }

  // Check our previous transactions
  console.log('\n📜 Checking previous transactions:');
  console.log('   tx1: 0x9a52f9248f4facd8138e267d3895fa66b9be808444241fab5c02433fa0a3f9d8');
  console.log('   tx2: 0x803e3a48c9c847a34d158d0c176b2c6e990bdea2a601194b2b34a00b68a6ffb1');
  
  const provider = signer.provider;
  
  try {
    const tx1 = await provider.getTransactionReceipt('0x9a52f9248f4facd8138e267d3895fa66b9be808444241fab5c02433fa0a3f9d8');
    const tx2 = await provider.getTransactionReceipt('0x803e3a48c9c847a34d158d0c176b2c6e990bdea2a601194b2b34a00b68a6ffb1');
    
    console.log('\nTransaction 1 (first liquidity):');
    console.log('   Status:', tx1.status === 1 ? '✅ Success' : '❌ Reverted');
    console.log('   Logs:', tx1.logs.length);
    console.log('   To:', tx1.to);
    
    console.log('\nTransaction 2 (second liquidity):');
    console.log('   Status:', tx2.status === 1 ? '✅ Success' : '❌ Reverted');
    console.log('   Logs:', tx2.logs.length);
    console.log('   To:', tx2.to);

    // Decode Initialize event if present
    const initTopic = ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
    console.log('\n🔍 Looking for Initialize events...');
    
    const allLogs = [...tx1.logs, ...tx2.logs];
    const initEvents = allLogs.filter(log => log.topics[0] === initTopic);
    
    if (initEvents.length > 0) {
      console.log(`✅ Found ${initEvents.length} Initialize event(s)!`);
      initEvents.forEach((event, i) => {
        console.log(`\n   Event ${i+1}:`);
        console.log('      Pool ID:', event.topics[1]);
        console.log('      Contract:', event.address);
      });
    } else {
      console.log('❌ No Initialize events found in these transactions');
      console.log('   This means the pool was NEVER initialized!');
    }

  } catch (error) {
    console.log('Error fetching transactions:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
