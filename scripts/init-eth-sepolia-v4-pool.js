const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 INITIALIZING AND ADDING LIQUIDITY ON ETHEREUM SEPOLIA\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  // Ethereum Sepolia V4 Contracts
  const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543';
  const POSITION_MANAGER = '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4';
  const STATE_VIEW = '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c';
  const MODIFY_LIQUIDITY_TEST = '0x0c478023803a644c94c4ce1c1e7b9a087e411b0a';

  // Tokens
  const AED = '0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c';
  const INR = '0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41';

  // Sort tokens (lower address first)
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const isAEDToken0 = token0 === AED;

  console.log('📋 Pool Configuration:');
  console.log('  Token0:', token0, isAEDToken0 ? '(AED)' : '(INR)');
  console.log('  Token1:', token1, isAEDToken0 ? '(INR)' : '(AED)');
  console.log('  Fee: 3000 (0.3%)');
  console.log('  Tick Spacing: 60');

  const fee = 3000;
  const tickSpacing = 60;
  const hooks = ethers.ZeroAddress;

  // Price: 1 AED = 22.727 INR
  // If AED is token0: sqrtPriceX96 = sqrt(22.727) * 2^96
  // If INR is token0: sqrtPriceX96 = sqrt(1/22.727) * 2^96
  const sqrtPriceX96 = isAEDToken0 
    ? '377680650705498097308424011251'  // sqrt(22.727) * 2^96
    : '16612068664016978285223648916';  // sqrt(1/22.727) * 2^96

  console.log('  Initial sqrtPriceX96:', sqrtPriceX96);

  // Calculate pool ID
  const poolKey = [token0, token1, fee, tickSpacing, hooks];
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      poolKey
    )
  );
  console.log('  Pool ID:', poolId);

  // Check if pool already initialized
  console.log('\n🔍 Checking if pool exists...');
  const poolManager = new ethers.Contract(
    POOL_MANAGER,
    ['function extsload(bytes32 slot) view returns (bytes32)'],
    signer
  );

  let slot = await poolManager.extsload(poolId);
  console.log('  Pool storage:', slot);

  if (slot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.log('  ❌ Pool not initialized\n');

    // STEP 1: Initialize pool
    console.log('📤 STEP 1: Initializing pool via PositionManager...');
    const positionManager = new ethers.Contract(
      POSITION_MANAGER,
      [
        'function initializePool((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint160 sqrtPriceX96) payable returns (int24 tick)'
      ],
      signer
    );

    try {
      const gasEstimate = await positionManager.initializePool.estimateGas(poolKey, sqrtPriceX96);
      console.log('  Gas estimate:', gasEstimate.toString());

      const tx = await positionManager.initializePool(poolKey, sqrtPriceX96, {
        gasLimit: gasEstimate * 120n / 100n
      });

      console.log('  Transaction:', tx.hash);
      console.log('  🔗 https://sepolia.etherscan.io/tx/' + tx.hash);
      console.log('  ⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('  ✅ Pool initialized!');
      console.log('     Block:', receipt.blockNumber);
      console.log('     Gas used:', receipt.gasUsed.toString());
      console.log('     Events:', receipt.logs.length);

      // Verify Initialize event
      const initTopic = ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
      const initEvents = receipt.logs.filter(log => log.topics[0] === initTopic);
      
      if (initEvents.length > 0) {
        console.log('     ✅ Initialize event confirmed!');
      } else {
        console.log('     ⚠️  No Initialize event found');
      }

      // Re-check pool state
      slot = await poolManager.extsload(poolId);
      console.log('\n  📊 New pool storage:', slot);
      
      if (slot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('  ❌ Pool still not initialized - stopping here');
        return;
      }

    } catch (error) {
      console.log('  ❌ Initialization failed:', error.message);
      console.log('\nTrying StateView to check if someone else initialized it...');
      
      // Try reading with StateView
      const stateView = new ethers.Contract(
        STATE_VIEW,
        ['function getSlot0(address poolManager, bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'],
        signer
      );
      
      try {
        const result = await stateView.getSlot0(POOL_MANAGER, poolId);
        console.log('✅ Pool exists! sqrtPriceX96:', result.sqrtPriceX96.toString());
      } catch (err) {
        console.log('❌ Pool definitely not initialized. Stopping.');
        return;
      }
    }
  } else {
    console.log('  ✅ Pool already initialized!\n');
  }

  // STEP 2: Add liquidity
  console.log('💰 STEP 2: Adding liquidity (1000 AED + ~22,727 INR)...\n');

  // Check token balances
  const aedToken = new ethers.Contract(AED, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)'
  ], signer);

  const inrToken = new ethers.Contract(INR, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)'
  ], signer);

  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  const aedDecimals = await aedToken.decimals();
  const inrDecimals = await inrToken.decimals();

  console.log('Available balances:');
  console.log('  AED:', ethers.formatUnits(aedBalance, aedDecimals));
  console.log('  INR:', ethers.formatUnits(inrBalance, inrDecimals));

  const aedAmount = 1000n * 10n**BigInt(aedDecimals);
  const inrAmount = 22727n * 10n**BigInt(inrDecimals);

  console.log('\nAdding:');
  console.log('  AED:', ethers.formatUnits(aedAmount, aedDecimals));
  console.log('  INR:', ethers.formatUnits(inrAmount, inrDecimals));

  if (aedBalance < aedAmount) {
    console.log('❌ Insufficient AED balance');
    return;
  }
  if (inrBalance < inrAmount) {
    console.log('❌ Insufficient INR balance');
    return;
  }

  // Approve tokens
  console.log('\n📝 Approving tokens...');
  const approveTx1 = await aedToken.approve(MODIFY_LIQUIDITY_TEST, aedAmount);
  await approveTx1.wait();
  console.log('  ✅ AED approved');

  const approveTx2 = await inrToken.approve(MODIFY_LIQUIDITY_TEST, inrAmount);
  await approveTx2.wait();
  console.log('  ✅ INR approved');

  // Add liquidity via PoolModifyLiquidityTest
  const modifyLiquidityTest = new ethers.Contract(
    MODIFY_LIQUIDITY_TEST,
    [
      'function modifyLiquidity((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) payable returns (int256, int256)'
    ],
    signer
  );

  // Full range liquidity
  const liquidityParams = [
    -887220, // tickLower (full range)
    887220,  // tickUpper (full range)
    ethers.parseUnits('1000', 18), // liquidity delta
    ethers.ZeroHash // salt
  ];

  console.log('\n📤 Adding liquidity...');
  try {
    const gasEstimate = await modifyLiquidityTest.modifyLiquidity.estimateGas(
      poolKey,
      liquidityParams,
      '0x'
    );
    console.log('  Gas estimate:', gasEstimate.toString());

    const tx = await modifyLiquidityTest.modifyLiquidity(
      poolKey,
      liquidityParams,
      '0x',
      { gasLimit: gasEstimate * 120n / 100n }
    );

    console.log('  Transaction:', tx.hash);
    console.log('  🔗 https://sepolia.etherscan.io/tx/' + tx.hash);
    console.log('  ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('  ✅ Liquidity added!');
    console.log('     Block:', receipt.blockNumber);
    console.log('     Gas used:', receipt.gasUsed.toString());

    // Check remaining balances
    const newAedBalance = await aedToken.balanceOf(signer.address);
    const newInrBalance = await inrToken.balanceOf(signer.address);

    console.log('\n💰 Remaining balances:');
    console.log('  AED:', ethers.formatUnits(newAedBalance, aedDecimals));
    console.log('  INR:', ethers.formatUnits(newInrBalance, inrDecimals));

  } catch (error) {
    console.log('  ❌ Failed to add liquidity:', error.message);
    return;
  }

  // STEP 3: Verify with StateView
  console.log('\n🔍 STEP 3: Verifying pool state with StateView...');
  const stateView = new ethers.Contract(
    STATE_VIEW,
    ['function getSlot0(address poolManager, bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'],
    signer
  );

  try {
    const result = await stateView.getSlot0(POOL_MANAGER, poolId);
    console.log('  ✅ Pool state readable!');
    console.log('     sqrtPriceX96:', result.sqrtPriceX96.toString());
    console.log('     tick:', result.tick.toString());
    console.log('     protocolFee:', result.protocolFee);
    console.log('     lpFee:', result.lpFee);

    console.log('\n🎉 SUCCESS! Ethereum Sepolia V4 pool is fully operational!');
    console.log('\n💡 Next steps:');
    console.log('   1. Update your frontend to connect to Ethereum Sepolia');
    console.log('   2. Frontend should now show V4 quotes');
    console.log('   3. Test swaps on Ethereum Sepolia network');

  } catch (error) {
    console.log('  ❌ Cannot read pool state:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
