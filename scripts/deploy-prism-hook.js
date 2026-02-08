/**
 * Deploy PRISMHook to Base Sepolia
 * 
 * This hook enables on-chain attestation of off-chain settlements,
 * anchoring Yellow Network state channel transfers to Uniswap V4 fixing rates.
 */

const hre = require("hardhat");

async function main() {
    console.log("🔷 Deploying PRISMHook to Base Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get Uniswap V4 PoolManager address from deployment file
    const deployment = require('../deployments/base-sepolia-deployment.json');
    const poolManager = deployment.uniswapV4.poolManager;

    console.log("📍 Uniswap V4 PoolManager:", poolManager, "\n");

    // Deploy PRISMHook
    const PRISMHook = await hre.ethers.getContractFactory("PRISMHook");
    const prismHook = await PRISMHook.deploy(poolManager);
    
    await prismHook.waitForDeployment();
    const prismHookAddress = await prismHook.getAddress();

    console.log("✅ PRISMHook deployed to:", prismHookAddress);

    // Note: Deployer is automatically added as a relayer in the constructor
    console.log("\n✅ Deployer automatically authorized as relayer (set in constructor)");

    // Update deployment file
    deployment.prismHook = {
        address: prismHookAddress,
        owner: deployer.address,
        authorizedRelayers: [deployer.address],
        poolManager: poolManager,
        deploymentTx: prismHook.deploymentTransaction()?.hash,
    };

    const fs = require('fs');
    fs.writeFileSync(
        './deployments/base-sepolia-deployment.json',
        JSON.stringify(deployment, null, 2)
    );

    console.log("\n📝 Deployment info saved to deployments/base-sepolia-deployment.json");

    console.log("\n🎯 Next Steps:");
    console.log("1. Update frontend/src/lib/prismHookService.ts with new address:");
    console.log(`   address: '${prismHookAddress}',`);
    console.log("\n2. Verify contract on BaseScan:");
    console.log(`   npx hardhat verify --network baseSepolia ${prismHookAddress} ${poolManager}`);
    console.log("\n3. Test attestation submission from the frontend!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
