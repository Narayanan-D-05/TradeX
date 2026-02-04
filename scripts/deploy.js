const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting TradeX Deployment to", hre.network.name);
    console.log("================================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    const addresses = {};

    // 1. Deploy MockERC20 - INR Stable
    console.log("1️⃣  Deploying INR Stable token...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const inrStable = await MockERC20.deploy("INR Stable", "INRs", 18);
    await inrStable.waitForDeployment();
    addresses.INR_STABLE = await inrStable.getAddress();
    console.log("   ✅ INR Stable:", addresses.INR_STABLE);

    // 2. Deploy MockERC20 - AED Stable
    console.log("2️⃣  Deploying AED Stable token...");
    const aedStable = await MockERC20.deploy("AED Stable", "AEDs", 18);
    await aedStable.waitForDeployment();
    addresses.AED_STABLE = await aedStable.getAddress();
    console.log("   ✅ AED Stable:", addresses.AED_STABLE);

    // 3. Deploy MockERC20 - USDC
    console.log("3️⃣  Deploying USDC token...");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    addresses.USDC = await usdc.getAddress();
    console.log("   ✅ USDC:", addresses.USDC);

    // 4. Deploy TradeXOracle
    console.log("4️⃣  Deploying TradeXOracle...");
    const TradeXOracle = await hre.ethers.getContractFactory("TradeXOracle");
    const oracle = await TradeXOracle.deploy();
    await oracle.waitForDeployment();
    addresses.ORACLE = await oracle.getAddress();
    console.log("   ✅ Oracle:", addresses.ORACLE);

    // 5. Deploy TradeXBridge
    console.log("5️⃣  Deploying TradeXBridge...");
    const TradeXBridge = await hre.ethers.getContractFactory("TradeXBridge");
    const bridge = await TradeXBridge.deploy();
    await bridge.waitForDeployment();
    addresses.BRIDGE = await bridge.getAddress();
    console.log("   ✅ Bridge:", addresses.BRIDGE);

    // 6. Deploy ComplianceGuard
    console.log("6️⃣  Deploying ComplianceGuard...");
    const ComplianceGuard = await hre.ethers.getContractFactory("ComplianceGuard");
    const compliance = await ComplianceGuard.deploy();
    await compliance.waitForDeployment();
    addresses.COMPLIANCE = await compliance.getAddress();
    console.log("   ✅ Compliance:", addresses.COMPLIANCE);

    // 7. Deploy ArcGateway
    console.log("7️⃣  Deploying ArcGateway...");
    const ArcGateway = await hre.ethers.getContractFactory("ArcGateway");
    const arcGateway = await ArcGateway.deploy(
        addresses.USDC,
        addresses.AED_STABLE,
        addresses.ORACLE
    );
    await arcGateway.waitForDeployment();
    addresses.ARC_GATEWAY = await arcGateway.getAddress();
    console.log("   ✅ ArcGateway:", addresses.ARC_GATEWAY);

    // 8. Deploy YellowAdapter
    console.log("8️⃣  Deploying YellowAdapter...");
    const YellowAdapter = await hre.ethers.getContractFactory("YellowAdapter");
    const yellowAdapter = await YellowAdapter.deploy();
    await yellowAdapter.waitForDeployment();
    addresses.YELLOW_ADAPTER = await yellowAdapter.getAddress();
    console.log("   ✅ YellowAdapter:", addresses.YELLOW_ADAPTER);

    // 9. Deploy LIFIRouter
    console.log("9️⃣  Deploying LIFIRouter...");
    const LIFIRouter = await hre.ethers.getContractFactory("LIFIRouter");
    const lifiRouter = await LIFIRouter.deploy(
        "0x0000000000000000000000000000000000000000", // Mock LiFi Diamond
        addresses.YELLOW_ADAPTER
    );
    await lifiRouter.waitForDeployment();
    addresses.LIFI_ROUTER = await lifiRouter.getAddress();
    console.log("   ✅ LIFIRouter:", addresses.LIFI_ROUTER);

    // 10. Deploy TradeX (Main Contract)
    console.log("🔟 Deploying TradeX (Main Contract)...");
    const TradeX = await hre.ethers.getContractFactory("TradeX");
    const tradeX = await TradeX.deploy(
        addresses.BRIDGE,
        addresses.ORACLE,
        addresses.ARC_GATEWAY,
        addresses.COMPLIANCE,
        addresses.INR_STABLE,
        addresses.AED_STABLE,
        addresses.USDC
    );
    await tradeX.waitForDeployment();
    addresses.TRADEX = await tradeX.getAddress();
    console.log("   ✅ TradeX:", addresses.TRADEX);

    console.log("\n================================================");
    console.log("🎉 All contracts deployed successfully!\n");

    // Save addresses to JSON file
    const deploymentsPath = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath, { recursive: true });
    }

    const deploymentFile = path.join(
        deploymentsPath,
        `${hre.network.name}-deployment.json`
    );

    const deploymentData = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: addresses,
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("📄 Addresses saved to:", deploymentFile);

    // Update frontend .env.local
    const envLocalPath = path.join(__dirname, "..", "frontend", ".env.local");
    const envContent = `# TradeX Contract Addresses (${hre.network.name})
# Auto-generated by deployment script at ${new Date().toISOString()}

NEXT_PUBLIC_CHAIN_ID=${hre.network.config.chainId}
NEXT_PUBLIC_RPC_URL=${hre.network.config.url || "https://rpc.sepolia.org"}

# Token Contracts
NEXT_PUBLIC_INR_STABLE=${addresses.INR_STABLE}
NEXT_PUBLIC_AED_STABLE=${addresses.AED_STABLE}
NEXT_PUBLIC_USDC=${addresses.USDC}

# Core Contracts
NEXT_PUBLIC_TRADEX=${addresses.TRADEX}
NEXT_PUBLIC_BRIDGE=${addresses.BRIDGE}
NEXT_PUBLIC_ORACLE=${addresses.ORACLE}
NEXT_PUBLIC_COMPLIANCE=${addresses.COMPLIANCE}
NEXT_PUBLIC_ARC_GATEWAY=${addresses.ARC_GATEWAY}
NEXT_PUBLIC_YELLOW_ADAPTER=${addresses.YELLOW_ADAPTER}
NEXT_PUBLIC_LIFI_ROUTER=${addresses.LIFI_ROUTER}
`;

    fs.writeFileSync(envLocalPath, envContent);
    console.log("📄 Frontend .env.local updated:", envLocalPath);

    // Print summary table
    console.log("\n📋 Deployed Contracts Summary:");
    console.log("─".repeat(60));
    Object.entries(addresses).forEach(([name, addr]) => {
        console.log(`${name.padEnd(20)} │ ${addr}`);
    });
    console.log("─".repeat(60));

    return addresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
