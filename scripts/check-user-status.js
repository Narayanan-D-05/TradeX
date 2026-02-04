const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Checking User Token Status...\n");

    const [deployer] = await hre.ethers.getSigners();

    // The user's address (from the screenshot - test4 wallet)
    // We'll check both deployer and see common issues
    const userAddress = deployer.address; // Change if needed

    console.log("Checking for address:", userAddress);

    // Load deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contracts = deployment.contracts;

    // Get token contracts
    const inrToken = await hre.ethers.getContractAt("MockERC20", contracts.INR_STABLE);
    const aedToken = await hre.ethers.getContractAt("MockERC20", contracts.AED_STABLE);
    const router = await hre.ethers.getContractAt("LIFIRouter", contracts.LIFI_ROUTER);

    // Check balances
    console.log("\n💰 Token Balances:");
    const inrBalance = await inrToken.balanceOf(userAddress);
    const aedBalance = await aedToken.balanceOf(userAddress);
    console.log("  INR Balance:", hre.ethers.formatEther(inrBalance), "INR");
    console.log("  AED Balance:", hre.ethers.formatEther(aedBalance), "AED");

    // Check allowances
    console.log("\n🔓 Allowances to LIFI Router:");
    const inrAllowance = await inrToken.allowance(userAddress, contracts.LIFI_ROUTER);
    const aedAllowance = await aedToken.allowance(userAddress, contracts.LIFI_ROUTER);
    console.log("  INR Allowance:", hre.ethers.formatEther(inrAllowance), "INR");
    console.log("  AED Allowance:", hre.ethers.formatEther(aedAllowance), "AED");

    // Check if tokens are supported
    console.log("\n🪙 Token Support in Router:");
    console.log("  INR supported:", await router.supportedTokens(contracts.INR_STABLE));
    console.log("  AED supported:", await router.supportedTokens(contracts.AED_STABLE));

    // Check route
    console.log("\n🛤️ Route Check:");
    const SEPOLIA = 11155111;
    const ARC = 5042002;
    console.log("  Current chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
    console.log("  Sepolia -> Arc route active:", await router.isRouteActive(SEPOLIA, ARC));

    // Mint tokens if balance is 0
    if (inrBalance === 0n) {
        console.log("\n🪙 Minting INR tokens for testing...");
        try {
            const tx = await inrToken.faucet();
            await tx.wait();
            console.log("  ✅ Minted 10000 INR");
        } catch (e) {
            console.log("  ⚠️ Faucet failed:", e.message);
        }
    }

    console.log("\n✅ Check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
