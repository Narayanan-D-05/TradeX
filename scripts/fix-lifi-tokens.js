const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Configuring LI.FI Router Token Support...");
    console.log("================================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Load deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("Deployment file not found!");
    }
    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contracts = deployment.contracts;

    // Get LIFIRouter contract
    const LIFIRouter = await hre.ethers.getContractFactory("LIFIRouter");
    const router = LIFIRouter.attach(contracts.LIFI_ROUTER);
    console.log("Attacking to LIFIRouter at:", contracts.LIFI_ROUTER);

    const tokens = [
        { name: "INR Stable", address: contracts.INR_STABLE },
        { name: "AED Stable", address: contracts.AED_STABLE },
        { name: "USDC", address: contracts.USDC }
    ];

    for (const token of tokens) {
        console.log(`\nChecking support for ${token.name} (${token.address})...`);
        try {
            // Check if already supported (by trying to add it, or we can just add it blindly as it's idempotent-ish or we catch error)
            // But wait, the contract doesn't have a check function exposed easily other than public mapping.
            // Let's just add it.
            console.log(`Adding ${token.name}...`);
            const tx = await router.addSupportedToken(token.address);
            console.log("Tx sent:", tx.hash);
            await tx.wait();
            console.log("✅ Added!");
        } catch (error) {
            console.log(`⚠️ Failed to add ${token.name}:`, error.message);
        }
    }

    console.log("\n================================================");
    console.log("🎉 Configuration complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
