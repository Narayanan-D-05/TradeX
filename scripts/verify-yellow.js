const { ethers } = require("hardhat");
require("dotenv").config();

const YELLOW_ADAPTER = "0xF23584D7b593Cf4ba12d775C1C3E93C4D5342356";

async function main() {
    console.log("🔍 Checking YellowAdapter contract state...\n");

    const yellowAdapter = await ethers.getContractAt("YellowAdapter", YELLOW_ADAPTER);

    // Check contract configuration
    const minDeposit = await yellowAdapter.minDeposit();
    const maxDuration = await yellowAdapter.maxSessionDuration();
    const owner = await yellowAdapter.owner();

    console.log("📋 Contract Configuration:");
    console.log("  Address:", YELLOW_ADAPTER);
    console.log("  Owner:", owner);
    console.log("  Min Deposit:", ethers.formatEther(minDeposit), "ETH");
    console.log("  Max Session Duration:", Number(maxDuration) / 3600, "hours");

    // Check code at address
    const code = await ethers.provider.getCode(YELLOW_ADAPTER);
    console.log("\n  Contract deployed:", code !== "0x" ? "✅ Yes" : "❌ No");

    if (code === "0x") {
        console.log("\n⚠️  WARNING: No contract code at this address!");
        console.log("   The YellowAdapter might not be deployed correctly.");
    }
}

main().catch(console.error);
