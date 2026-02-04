const hre = require("hardhat");

async function main() {
    console.log("🚀 Testing single contract deployment to", hre.network.name);
    console.log("================================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    try {
        console.log("Deploying MockERC20...");
        const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

        // Estimate gas first
        const deployTx = await MockERC20.getDeployTransaction("Test Token", "TEST", 18);
        const gasEstimate = await hre.ethers.provider.estimateGas(deployTx);
        console.log("Estimated gas:", gasEstimate.toString());

        const feeData = await hre.ethers.provider.getFeeData();
        console.log("Gas price:", hre.ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");

        const estimatedCost = gasEstimate * (feeData.gasPrice || 0n);
        console.log("Estimated cost:", hre.ethers.formatEther(estimatedCost), "ETH");

        if (balance < estimatedCost) {
            console.log("\n❌ Insufficient balance for deployment!");
            console.log("Need:", hre.ethers.formatEther(estimatedCost), "ETH");
            console.log("Have:", hre.ethers.formatEther(balance), "ETH");
            return;
        }

        console.log("\nDeploying contract...");
        const token = await MockERC20.deploy("Test Token", "TEST", 18);
        console.log("Transaction hash:", token.deploymentTransaction().hash);

        console.log("Waiting for confirmation...");
        await token.waitForDeployment();

        console.log("✅ Deployed to:", await token.getAddress());
    } catch (error) {
        console.error("\n❌ Deployment failed!");
        console.error("Error:", error.message);
        if (error.code) console.error("Code:", error.code);
        if (error.reason) console.error("Reason:", error.reason);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
