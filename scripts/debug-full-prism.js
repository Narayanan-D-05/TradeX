/**
 * Full debug: simulate the exact frontend flow
 */
const hre = require("hardhat");

async function main() {
    const deployment = require('../deployments/base-sepolia-deployment.json');
    const prismHookAddr = deployment.prismHook.address;
    
    const [deployer] = await hre.ethers.getSigners();
    
    const PRISMHook = await hre.ethers.getContractFactory("PRISMHook");
    const prismHook = PRISMHook.attach(prismHookAddr);
    
    // Read current epoch
    const currentEpoch = await prismHook.currentEpoch();
    console.log("Current on-chain epoch:", currentEpoch.toString());

    // Pool key (same as frontend getPoolKey())
    const poolKey = {
        currency0: deployment.pool.currency0,
        currency1: deployment.pool.currency1,
        fee: deployment.pool.fee,
        tickSpacing: deployment.pool.tickSpacing,
        hooks: deployment.pool.hooks || "0x0000000000000000000000000000000000000000",
    };

    // Compute poolId the same way contract does: keccak256(abi.encode(key))
    const contractPoolId = hre.ethers.keccak256(
        hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log("\nComputed poolId:", contractPoolId);
    console.log("Deployment poolId:", deployment.pool.id);
    console.log("Pool IDs match:", contractPoolId === deployment.pool.id);

    // Check if any fixing exists for this poolId at each epoch
    console.log("\n--- Checking fixing history ---");
    for (let i = 1; i <= Number(currentEpoch); i++) {
        try {
            const fixing = await prismHook.fixingHistory(contractPoolId, i);
            console.log(`Epoch ${i}: epoch=${fixing.epoch}, timestamp=${fixing.timestamp}, sqrtPrice=${fixing.sqrtPriceX96}`);
        } catch (err) {
            console.log(`Epoch ${i}: ERROR - ${err.message?.slice(0, 100)}`);
        }
    }

    // Step 1: Call captureFixingRate to register a new epoch
    console.log("\n--- Step 1: captureFixingRate ---");
    try {
        const tx = await prismHook.captureFixingRate(poolKey);
        const receipt = await tx.wait();
        console.log("✅ captureFixingRate succeeded! Tx:", tx.hash);

        const newEpoch = await prismHook.currentEpoch();
        console.log("New epoch:", newEpoch.toString());

        // Check the fixing was stored correctly
        const fixing = await prismHook.fixingHistory(contractPoolId, newEpoch);
        console.log("Fixing stored - epoch:", fixing.epoch.toString(), "poolId from fixing matches:", fixing.poolId === contractPoolId);
        console.log("Fixing poolId:", fixing.poolId);
        console.log("Expected poolId:", contractPoolId);

        // Step 2: Try attestSettlement with the new epoch
        console.log("\n--- Step 2: attestSettlement ---");
        const merkleRoot = "0x466c8b5e07219247ec4520b159029fa0155a188e1770670a5880e733bca1b403";
        
        try {
            const tx2 = await prismHook.attestSettlement(
                contractPoolId,
                newEpoch,
                merkleRoot,
                1,      // settlementCount
                1000000  // totalVolume
            );
            const receipt2 = await tx2.wait();
            console.log("✅ attestSettlement succeeded! Tx:", tx2.hash);
        } catch (err) {
            console.log("❌ attestSettlement FAILED!");
            console.log("Error:", err.message?.slice(0, 500));
        }
    } catch (err) {
        console.log("❌ captureFixingRate FAILED!");
        console.log("Error:", err.message?.slice(0, 500));
    }
}

main().catch(console.error);
