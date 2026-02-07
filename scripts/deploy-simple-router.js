const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Official PoolManager on Base Sepolia
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SimpleV4Router with account:", deployer.address);

    const SimpleV4Router = await ethers.getContractFactory("SimpleV4Router");
    const router = await SimpleV4Router.deploy(POOL_MANAGER);

    await router.waitForDeployment();
    const routerAddress = await router.getAddress();

    console.log("✅ SimpleV4Router deployed to:", routerAddress);
    console.log("Scanning on BaseScan: https://sepolia.basescan.org/address/" + routerAddress);

    // Update deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
    let deployment = {};
    if (fs.existsSync(deploymentPath)) {
        deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    }

    if (!deployment.helpers) deployment.helpers = {};
    deployment.helpers.simpleV4Router = routerAddress;

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("Saved to deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
