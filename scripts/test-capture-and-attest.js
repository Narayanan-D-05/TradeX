/**
 * Test captureAndAttest on the new PRISMHook
 */
const hre = require("hardhat");

async function main() {
    const deployment = require('../deployments/base-sepolia-deployment.json');
    const [deployer] = await hre.ethers.getSigners();

    const PRISMHook = await hre.ethers.getContractFactory("PRISMHook");
    const prismHook = PRISMHook.attach(deployment.prismHook.address);

    console.log("PRISMHook:", deployment.prismHook.address);
    console.log("Current epoch:", (await prismHook.currentEpoch()).toString());

    const poolKey = {
        currency0: deployment.pool.currency0,
        currency1: deployment.pool.currency1,
        fee: deployment.pool.fee,
        tickSpacing: deployment.pool.tickSpacing,
        hooks: "0x0000000000000000000000000000000000000000",
    };

    const merkleRoot = "0x466c8b5e07219247ec4520b159029fa0155a188e1770670a5880e733bca1b403";

    console.log("\n--- Testing captureAndAttest ---");
    try {
        const tx = await prismHook.captureAndAttest(poolKey, merkleRoot, 1, 1000000);
        const receipt = await tx.wait();
        console.log("✅ captureAndAttest succeeded! Tx:", tx.hash);
        console.log("New epoch:", (await prismHook.currentEpoch()).toString());
    } catch (err) {
        console.log("❌ FAILED:", err.message?.slice(0, 500));
    }
}

main().catch(console.error);
