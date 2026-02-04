const hre = require("hardhat");

async function main() {
    console.log("🔍 Checking Token Balances...\n");

    const [deployer] = await hre.ethers.getSigners();

    // Read addresses from deployment file
    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const inrAddress = deployment.contracts.INR_STABLE;
    const aedAddress = deployment.contracts.AED_STABLE;
    const lifiRouter = deployment.contracts.LIFI_ROUTER;

    console.log("INR Token:", inrAddress);
    console.log("AED Token:", aedAddress);
    console.log("LI.FI Router:", lifiRouter);
    console.log("");

    // Get token contracts
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const inrToken = MockERC20.attach(inrAddress);
    const aedToken = MockERC20.attach(aedAddress);

    // Check user balance (replace with recipient address)
    const recipientAddress = "0x1cC4bf265cA5497C97741abc1a263dc48f96E754"; // User's address from screenshots

    console.log("=== Balances for", recipientAddress, "===");
    const inrBalance = await inrToken.balanceOf(recipientAddress);
    const aedBalance = await aedToken.balanceOf(recipientAddress);
    console.log("INR Balance:", hre.ethers.formatEther(inrBalance));
    console.log("AED Balance:", hre.ethers.formatEther(aedBalance));

    console.log("\n=== Balances for LI.FI Router ===");
    const routerInrBalance = await inrToken.balanceOf(lifiRouter);
    const routerAedBalance = await aedToken.balanceOf(lifiRouter);
    console.log("INR Balance:", hre.ethers.formatEther(routerInrBalance));
    console.log("AED Balance:", hre.ethers.formatEther(routerAedBalance));

    // Test direct mint
    console.log("\n=== Testing Direct Mint ===");
    try {
        const tx = await aedToken.mint(recipientAddress, hre.ethers.parseEther("100"));
        await tx.wait();
        console.log("✅ Direct mint successful!");
        const newAedBalance = await aedToken.balanceOf(recipientAddress);
        console.log("New AED Balance:", hre.ethers.formatEther(newAedBalance));
    } catch (error) {
        console.log("❌ Direct mint failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
