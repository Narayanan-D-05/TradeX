const { ethers } = require("hardhat");

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

async function main() {
    console.log("🔍 Verifying Pool Initialization\n");

    // Load token addresses
    const deployment = require("../deployments/sepolia-deployment.json");
    const AED_STABLE = deployment.contracts.AED_STABLE;
    const INR_STABLE = deployment.contracts.INR_STABLE;

    // Sort tokens
    const [currency0, currency1] = BigInt(AED_STABLE) < BigInt(INR_STABLE)
        ? [AED_STABLE, INR_STABLE]
        : [INR_STABLE, AED_STABLE];

    console.log("Currency0 (AED):", currency0);
    console.log("Currency1 (INR):", currency1);

    // Calculate pool ID using PoolId.toId() logic from v4-core
    // PoolId is keccak256(abi.encode(poolKey))
    const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Try different encoding methods
    console.log("\n📊 Pool ID Calculations:");
    
    // Method 1: Using tuple encoding
    const poolId1 = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(address,address,uint24,int24,address)"],
            [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
        )
    );
    console.log("Method 1 (tuple):", poolId1);

    // Method 2: Individual fields
    const poolId2 = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log("Method 2 (fields):", poolId2);

    // Now try getSlot0 on both
    const poolManager = await ethers.getContractAt(
        ["function getSlot0(bytes32) external view returns (uint160,int24)"],
        POOL_MANAGER
    );

    console.log("\n🔍 Checking Pool States:");
    
    try {
        const [sqrtPrice1, tick1] = await poolManager.getSlot0(poolId1);
        console.log("Pool ID 1 - sqrtPriceX96:", sqrtPrice1.toString(), "initialized:", sqrtPrice1 > 0n);
    } catch (e) {
        console.log("Pool ID 1 - Error:", e.message);
    }

    try {
        const [sqrtPrice2, tick2] = await poolManager.getSlot0(poolId2);
        console.log("Pool ID 2 - sqrtPriceX96:", sqrtPrice2.toString(), "initialized:", sqrtPrice2 > 0n);
    } catch (e) {
        console.log("Pool ID 2 - Error:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
