const { ethers } = require("hardhat");

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

async function main() {
    console.log("🔍 Checking Etherscan Transaction: 0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be\n");

    const [deployer] = await ethers.getSigners();
    
    const deployment = require("../deployments/sepolia-deployment.json");
    const AED_STABLE = deployment.contracts.AED_STABLE;
    const INR_STABLE = deployment.contracts.INR_STABLE;

    const [currency0, currency1] = BigInt(AED_STABLE) < BigInt(INR_STABLE)
        ? [AED_STABLE, INR_STABLE]
        : [INR_STABLE, AED_STABLE];

    // Get the transaction receipt
    const tx = await ethers.provider.getTransaction("0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be");
    const receipt = await ethers.provider.getTransactionReceipt("0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be");

    console.log("Transaction Details:");
    console.log("  From:", tx.from);
    console.log("  To:", tx.to);
    console.log("  Gas Used:", receipt.gasUsed.toString());
    console.log("  Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    console.log("  Logs count:", receipt.logs.length);

    if (receipt.logs.length === 0) {
        console.log("\n❌ Zero events emitted - function returned early or reverted silently");
        console.log("\nPossible reasons:");
        console.log("  1. Pool already exists (function checks and returns)");
        console.log("  2. Invalid parameters rejected");
        console.log("  3. PositionManager not properly configured");
        console.log("  4. Using wrong Uniswap version (V3 vs V4)");
    } else {
        console.log("\nLogs:");
        for (let i = 0; i < receipt.logs.length; i++) {
            console.log(`  Log ${i}:`);
            console.log(`    Address: ${receipt.logs[i].address}`);
            console.log(`    Topic0: ${receipt.logs[i].topics[0]}`);
        }
    }

    // Decode the transaction input
    console.log("\n📊 Decoding Transaction Input:");
    const posm = await ethers.getContractAt(
        ["function initializePool((address,address,uint24,int24,address),uint160) external returns (int24)"],
        tx.to
    );

    try {
        const decoded = posm.interface.parseTransaction({ data: tx.data });
        console.log("  Function:", decoded.name);
        console.log("  PoolKey:");
        console.log("    currency0:", decoded.args[0][0]);
        console.log("    currency1:", decoded.args[0][1]);
        console.log("    fee:", decoded.args[0][2]);
        console.log("    tickSpacing:", decoded.args[0][3]);
        console.log("    hooks:", decoded.args[0][4]);
        console.log("  sqrtPriceX96:", decoded.args[1].toString());
    } catch (e) {
        console.log("  Could not decode:", e.message);
    }

    // Calculate expected pool ID
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [currency0, currency1, 3000, 60, "0x0000000000000000000000000000000000000000"]
        )
    );
    console.log("\n📝 Expected Pool ID:", poolId);

    // Check if pool exists now
    const poolManager = await ethers.getContractAt(
        ["function getSlot0(bytes32) external view returns (uint160,int24)"],
        POOL_MANAGER
    );

    console.log("\n🔍 Checking Pool State:");
    try {
        const [sqrtPrice, tick] = await poolManager.getSlot0(poolId);
        console.log("  sqrtPriceX96:", sqrtPrice.toString());
        console.log("  tick:", tick.toString());
        console.log("  Pool exists:", sqrtPrice > 0n ? "YES ✅" : "NO ❌");

        if (sqrtPrice > 0n) {
            console.log("\n✅ POOL EXISTS! The initialization actually worked!");
            console.log("The issue was with checking the pool state immediately after.");
            console.log("You can now add liquidity!");
        }
    } catch (e) {
        console.log("  ❌ Pool query failed:", e.message);
        console.log("  This confirms the pool was NOT created");
    }

    // Check for Initialize event signature
    console.log("\n🔎 Looking for Initialize event:");
    const initEventSig = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
    console.log("  Expected topic:", initEventSig);
    
    const foundInit = receipt.logs.find(log => log.topics[0] === initEventSig);
    if (foundInit) {
        console.log("  ✅ Found Initialize event in logs!");
    } else {
        console.log("  ❌ No Initialize event found");
    }

    // Alternative: Check all events from PoolManager
    console.log("\n📋 All events from PoolManager:");
    const pmEvents = receipt.logs.filter(log => log.address.toLowerCase() === POOL_MANAGER.toLowerCase());
    console.log(`  Found ${pmEvents.length} events from PoolManager`);
    
    if (pmEvents.length > 0) {
        for (let i = 0; i < pmEvents.length; i++) {
            console.log(`  Event ${i}: ${pmEvents[i].topics[0]}`);
        }
    }

    console.log("\n💡 Diagnosis:");
    console.log("If gas usage is low (~30k) with zero events:");
    console.log("  → PositionManager.initializePool() is returning early");
    console.log("  → Likely checking if pool exists and finding it does (wrong?)");
    console.log("  → OR permission/validation check failing silently");
    console.log("\nNext step: Try a FRESH pool with different fee tier or tokens");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
