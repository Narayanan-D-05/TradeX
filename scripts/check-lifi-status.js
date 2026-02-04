const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Checking LI.FI Router Configuration...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Load deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contracts = deployment.contracts;

    console.log("\n📋 Contract Addresses:");
    console.log("  LIFI_ROUTER:", contracts.LIFI_ROUTER);
    console.log("  INR_STABLE:", contracts.INR_STABLE);
    console.log("  AED_STABLE:", contracts.AED_STABLE);

    // Get LIFIRouter contract
    const router = await hre.ethers.getContractAt("LIFIRouter", contracts.LIFI_ROUTER);

    // Check owner
    const owner = await router.owner();
    console.log("\n👤 Router Owner:", owner);
    console.log("   Is deployer owner?", owner.toLowerCase() === deployer.address.toLowerCase());

    // Check supported tokens
    console.log("\n🪙 Token Support Status:");
    const inrSupported = await router.supportedTokens(contracts.INR_STABLE);
    const aedSupported = await router.supportedTokens(contracts.AED_STABLE);
    console.log("  INR Stable supported:", inrSupported);
    console.log("  AED Stable supported:", aedSupported);

    // Check routes
    console.log("\n🛤️ Route Status:");
    const SEPOLIA_CHAIN_ID = 11155111;
    const ARC_CHAIN_ID = 5042002;

    const sepoliaToArc = await router.isRouteActive(SEPOLIA_CHAIN_ID, ARC_CHAIN_ID);
    const arcToSepolia = await router.isRouteActive(ARC_CHAIN_ID, SEPOLIA_CHAIN_ID);
    console.log("  Sepolia -> Arc active:", sepoliaToArc);
    console.log("  Arc -> Sepolia active:", arcToSepolia);

    // Fix any issues
    console.log("\n🔧 Fixing Issues...");

    if (!inrSupported) {
        console.log("  Adding INR token support...");
        const tx = await router.addSupportedToken(contracts.INR_STABLE);
        await tx.wait();
        console.log("  ✅ INR added");
    }

    if (!aedSupported) {
        console.log("  Adding AED token support...");
        const tx = await router.addSupportedToken(contracts.AED_STABLE);
        await tx.wait();
        console.log("  ✅ AED added");
    }

    if (!sepoliaToArc) {
        console.log("  Activating Sepolia -> Arc route...");
        const tx = await router.updateRoute(SEPOLIA_CHAIN_ID, ARC_CHAIN_ID, "0x0000000000000000000000000000000000000000", 30, true);
        await tx.wait();
        console.log("  ✅ Route activated");
    }

    // Verify final state
    console.log("\n✅ Final Verification:");
    console.log("  INR Stable supported:", await router.supportedTokens(contracts.INR_STABLE));
    console.log("  AED Stable supported:", await router.supportedTokens(contracts.AED_STABLE));
    console.log("  Sepolia -> Arc active:", await router.isRouteActive(SEPOLIA_CHAIN_ID, ARC_CHAIN_ID));

    console.log("\n🎉 Configuration complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
