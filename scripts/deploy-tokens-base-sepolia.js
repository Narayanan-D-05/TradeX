const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("🚀 Deploying Tokens to Base Sepolia\n");
    console.log("Deployer:", deployer.address);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.01")) {
        console.log("\n⚠️  Low balance! Get Base Sepolia ETH from:");
        console.log("   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
        console.log("   or bridge from Sepolia");
        return;
    }

    // Deploy MockERC20 for AED_STABLE
    console.log("\n1️⃣ Deploying AED_STABLE...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const aed = await MockERC20.deploy("AED Stable", "AED", 6);
    await aed.waitForDeployment();
    const aedAddress = await aed.getAddress();
    console.log("✅ AED_STABLE deployed:", aedAddress);

    // Deploy MockERC20 for INR_STABLE
    console.log("\n2️⃣ Deploying INR_STABLE...");
    const inr = await MockERC20.deploy("INR Stable", "INR", 6);
    await inr.waitForDeployment();
    const inrAddress = await inr.getAddress();
    console.log("✅ INR_STABLE deployed:", inrAddress);

    // Mint tokens
    const aedAmount = ethers.parseUnits("100100", 6); // 100,100 AED
    const inrAmount = ethers.parseUnits("2270000", 6); // 2,270,000 INR

    console.log("\n3️⃣ Minting tokens...");
    console.log("  Minting", ethers.formatUnits(aedAmount, 6), "AED...");
    let tx = await aed.mint(deployer.address, aedAmount);
    await tx.wait();
    
    console.log("  Minting", ethers.formatUnits(inrAmount, 6), "INR...");
    tx = await inr.mint(deployer.address, inrAmount);
    await tx.wait();
    
    console.log("✅ Tokens minted!");

    // Determine currency0 and currency1 (must be sorted)
    const [currency0, currency1] = BigInt(aedAddress) < BigInt(inrAddress)
        ? [aedAddress, inrAddress]
        : [inrAddress, aedAddress];

    console.log("\n📊 Deployment Summary:");
    console.log("════════════════════════════════════════════════════════");
    console.log("AED_STABLE:", aedAddress);
    console.log("INR_STABLE:", inrAddress);
    console.log("────────────────────────────────────────────────────────");
    console.log("Currency0:", currency0);
    console.log("Currency1:", currency1);
    console.log("════════════════════════════════════════════════════════");
    
    console.log("\n🔍 Verify on BaseScan:");
    console.log("  AED:", `https://sepolia.basescan.org/address/${aedAddress}`);
    console.log("  INR:", `https://sepolia.basescan.org/address/${inrAddress}`);

    console.log("\n📝 Save these addresses for next steps:");
    console.log(`AED_STABLE="${aedAddress}"`);
    console.log(`INR_STABLE="${inrAddress}"`);
    console.log(`CURRENCY0="${currency0}"`);
    console.log(`CURRENCY1="${currency1}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
