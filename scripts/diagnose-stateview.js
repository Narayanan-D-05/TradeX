const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 DIAGNOSING STATEVIEW CONTRACT\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
  const STATE_VIEW = '0x571291b572ed32ce6751a2cb2486ebee8defb9b4';
  const POOL_ID = '0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281';

  // Check if StateView contract exists
  const code = await provider.getCode(STATE_VIEW);
  console.log('✅ StateView contract exists:', code.length > 2);
  console.log('   Code size:', code.length, 'bytes\n');

  // Try Method 1: StateView.getSlot0(poolManager, poolId)
  console.log('📋 Method 1: StateView.getSlot0(poolManager, poolId)');
  try {
    const stateView1 = new ethers.Contract(
      STATE_VIEW,
      [
        'function getSlot0(address poolManager, bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'
      ],
      provider
    );
    const result = await stateView1.getSlot0(POOL_MANAGER, POOL_ID);
    console.log('✅ SUCCESS!');
    console.log('   sqrtPriceX96:', result.sqrtPriceX96.toString());
    console.log('   tick:', result.tick);
    console.log('   protocolFee:', result.protocolFee);
    console.log('   lpFee:', result.lpFee);
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Try Method 2: PoolManager.getSlot0(poolId) directly
  console.log('\n📋 Method 2: PoolManager.getSlot0(poolId) directly');
  try {
    const poolManager = new ethers.Contract(
      POOL_MANAGER,
      [
        'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)'
      ],
      provider
    );
    const result = await poolManager.getSlot0(POOL_ID);
    console.log('✅ SUCCESS!');
    console.log('   sqrtPriceX96:', result.sqrtPriceX96.toString());
    console.log('   tick:', result.tick);
    console.log('   protocolFee:', result.protocolFee);
    console.log('   lpFee:', result.lpFee);
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Try Method 3: Check pool initialization via getLiquidity
  console.log('\n📋 Method 3: PoolManager.getLiquidity(poolId)');
  try {
    const poolManager = new ethers.Contract(
      POOL_MANAGER,
      ['function getLiquidity(bytes32 poolId) view returns (uint128)'],
      provider
    );
    const liquidity = await poolManager.getLiquidity(POOL_ID);
    console.log('✅ SUCCESS! Pool has liquidity:', liquidity.toString());
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Try Method 4: Check pool via extsload (low-level storage read)
  console.log('\n📋 Method 4: PoolManager.extsload (low-level)');
  try {
    const poolManager = new ethers.Contract(
      POOL_MANAGER,
      ['function extsload(bytes32 slot) view returns (bytes32)'],
      provider
    );
    const slot = await poolManager.extsload(POOL_ID);
    console.log('✅ SUCCESS! Pool slot data:', slot);
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Try Method 5: StateView with different return structure
  console.log('\n📋 Method 5: StateView.getSlot0 with struct return');
  try {
    const stateView2 = new ethers.Contract(
      STATE_VIEW,
      [
        'function getSlot0(address poolManager, bytes32 poolId) view returns (tuple(uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee))'
      ],
      provider
    );
    const result = await stateView2.getSlot0(POOL_MANAGER, POOL_ID);
    console.log('✅ SUCCESS!');
    console.log('   Result:', result);
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  // Check actual pool initialization event
  console.log('\n📋 Checking Initialize event on-chain...');
  const initTopic = ethers.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)');
  const filter = {
    address: POOL_MANAGER,
    topics: [initTopic],
    fromBlock: 37342000, // Around our init block
    toBlock: 37343000
  };
  
  try {
    const logs = await provider.getLogs(filter);
    console.log(`✅ Found ${logs.length} Initialize events`);
    for (const log of logs) {
      if (log.topics[1] && log.topics[1].toLowerCase().includes(POOL_ID.slice(2, 8).toLowerCase())) {
        console.log('   🎯 FOUND OUR POOL!');
        console.log('      Block:', log.blockNumber);
        console.log('      Tx:', log.transactionHash);
      }
    }
  } catch (error) {
    console.log('❌ Event query failed:', error.message);
  }

  console.log('\n✅ Diagnosis complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
