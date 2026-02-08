/**
 * Authorize a wallet address as a PRISM relayer
 */

const hre = require("hardhat");

async function main() {
    const deployment = require('../deployments/base-sepolia-deployment.json');
    const prismHookAddress = deployment.prismHook.address;

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("PRISMHook:", prismHookAddress);

    // Get PRISMHook contract
    const PRISMHook = await hre.ethers.getContractFactory("PRISMHook");
    const prismHook = PRISMHook.attach(prismHookAddress);

    // Address to authorize (replace with your wallet or leave as deployer)
    const relayerAddress = "0xcf9d7BCC38996d495BC0a46634B9179748ba6C78"; // Your wallet

    console.log(`\n🔐 Authorizing ${relayerAddress} as PRISM relayer...`);

    const tx = await prismHook.addRelayer(relayerAddress);
    await tx.wait();

    console.log(`✅ ${relayerAddress} is now authorized!`);
    console.log(`   Transaction: ${tx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
