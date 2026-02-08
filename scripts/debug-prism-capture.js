/**
 * Debug why captureFixingRate reverts
 */
const hre = require("hardhat");

async function main() {
    const deployment = require('../deployments/base-sepolia-deployment.json');
    
    console.log("=== PRISMHook Debug ===\n");
    console.log("PRISMHook:", deployment.prismHook.address);
    console.log("PoolManager (in PRISMHook):", deployment.prismHook.poolManager);
    console.log("Pool ID:", deployment.pool.id);
    console.log("\nPool config:");
    console.log("  currency0 (AED):", deployment.pool.currency0);
    console.log("  currency1 (INR):", deployment.pool.currency1);
    console.log("  fee:", deployment.pool.fee);
    console.log("  tickSpacing:", deployment.pool.tickSpacing);
    console.log("  hooks:", deployment.pool.hooks);
    
    // Try reading from the PoolManager
    const poolManager = await hre.ethers.getContractAt(
        ["function getSlot0(bytes32) view returns (uint160, int24, uint16, uint16)"],
        deployment.prismHook.poolManager
    );

    const poolId = deployment.pool.id;
    
    try {
        const [sqrtPriceX96, tick, protocolFee, lpFee] = await poolManager.getSlot0(poolId);
        console.log("\n✅ Pool exists in PoolManager!");
        console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
        console.log("  tick:", tick.toString());
    } catch (err) {
        console.log("\n❌ Pool NOT found in this PoolManager!");
        console.log("  Error:", err.message?.slice(0, 200));
    }

    // Try the alternative PoolManager
    if (deployment.alternativeV4) {
        console.log("\n--- Trying Alternative PoolManager ---");
        console.log("Alt PoolManager:", deployment.alternativeV4.poolManager);
        
        const altPoolManager = await hre.ethers.getContractAt(
            ["function getSlot0(bytes32) view returns (uint160, int24, uint16, uint16)"],
            deployment.alternativeV4.poolManager
        );
        
        try {
            const [sqrtPriceX96, tick] = await altPoolManager.getSlot0(poolId);
            console.log("✅ Pool exists in ALTERNATIVE PoolManager!");
            console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
            console.log("  tick:", tick.toString());
        } catch (err) {
            console.log("❌ Pool NOT found in alternative PoolManager either");
            console.log("  Error:", err.message?.slice(0, 200));
        }
    }

    // Check if captureFixingRate works directly
    console.log("\n--- Trying captureFixingRate ---");
    const PRISMHook = await hre.ethers.getContractFactory("PRISMHook");
    const prismHook = PRISMHook.attach(deployment.prismHook.address);
    
    const poolKey = {
        currency0: deployment.pool.currency0,
        currency1: deployment.pool.currency1,
        fee: deployment.pool.fee,
        tickSpacing: deployment.pool.tickSpacing,
        hooks: deployment.pool.hooks,
    };

    try {
        const result = await prismHook.captureFixingRate.staticCall(poolKey);
        console.log("✅ captureFixingRate would succeed! Epoch:", result.toString());
    } catch (err) {
        console.log("❌ captureFixingRate REVERTS!");
        console.log("  Error:", err.message?.slice(0, 300));
    }
}

main().catch(console.error);
