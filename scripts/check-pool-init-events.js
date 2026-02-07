const { ethers } = require("ethers");

const RPC_URL = "https://sepolia.base.org";
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const POOL_ID = "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281";

// Initialize event signature: Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)
const INITIALIZE_EVENT_TOPIC = "0x2ff5ec0fb5de27cfd8c7784d36c0b2a0f6f2f09bdc3f16045d93a9c036f5b80d";

async function main() {
    console.log("\n🔍 Checking for pool initialization events...\n");
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log(`📊 Current block: ${currentBlock}`);
    console.log(`🔍 Searching last 10,000 blocks for Initialize events...\n`);
    
    try {
        // Query logs for Initialize events
        const logs = await provider.getLogs({
            address: POOL_MANAGER,
            topics: [INITIALIZE_EVENT_TOPIC, POOL_ID],
            fromBlock: Math.max(0, currentBlock - 10000),
            toBlock: currentBlock
        });
        
        if (logs.length === 0) {
            console.log(`❌ No Initialize event found for pool ${POOL_ID}`);
            console.log(`\n✅ Pool is NOT initialized - you should be able to initialize it!`);
            console.log(`\n🤔 But initialization is failing... Let me check other possibilities:`);
            
            // Check if ANY pool was ever initialized on this PoolManager
            const anyInitLogs = await provider.getLogs({
                address: POOL_MANAGER,
                topics: [INITIALIZE_EVENT_TOPIC],
                fromBlock: Math.max(0, currentBlock - 10000),
                toBlock: currentBlock
            });
            
            console.log(`\n📋 Found ${anyInitLogs.length} Initialize events in last 10k blocks for ANY pool`);
            
            if (anyInitLogs.length > 0) {
                console.log(`\n✅ Other pools have been initialized successfully on this PoolManager`);
                console.log(`   This confirms the PoolManager is functional`);
            }
            
        } else {
            console.log(`✅ Found ${logs.length} Initialize event(s) for this pool!\n`);
            
            for (const log of logs) {
                const block = await provider.getBlock(log.blockNumber);
                console.log(`📍 Block: ${log.blockNumber}`);
                console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
                console.log(`   Tx Hash: ${log.transactionHash}`);
                console.log(`   BaseScan: https://sepolia.basescan.org/tx/${log.transactionHash}\n`);
            }
            
            console.log(`\n⚠️  Pool is ALREADY INITIALIZED!`);
            console.log(`   You can now add liquidity directly without initializing again.`);
        }
        
    } catch (error) {
        console.log(`❌ Error querying events: ${error.message}`);
    }
    
    // Additional diagnostic: try to read pool state using StateView
    console.log(`\n🔬 Attempting to read pool state using StateView...`);
    const STATE_VIEW = "0x571291b572ed32ce6751a2cb2486ebee8defb9b4";
    const stateView = new ethers.Contract(STATE_VIEW, [
        "function getSlot0(address poolManager, bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
    ], provider);
    
    try {
        const slot0 = await stateView.getSlot0(POOL_MANAGER, POOL_ID);
        console.log(`✅ StateView query successful!`);
        console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
        console.log(`   tick: ${slot0.tick.toString()}`);
        
        if (slot0.sqrtPriceX96 === 0n) {
            console.log(`\n⚠️  sqrtPriceX96 is 0 - pool NOT initialized`);
        } else {
            console.log(`\n✅ Pool IS initialized with sqrtPriceX96 = ${slot0.sqrtPriceX96.toString()}`);
        }
    } catch (e) {
        console.log(`❌ StateView query failed: ${e.message.split('\n')[0]}`);
    }
}

main().catch(console.error);
