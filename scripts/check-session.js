const { ethers } = require("hardhat");
require("dotenv").config();

const YELLOW_ADAPTER = process.env.YELLOW_ADAPTER || "0xF23584D7b593Cf4ba12d775C1C3E93C4D5342356";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Checking session for:", signer.address);

    const yellowAdapter = await ethers.getContractAt("YellowAdapter", YELLOW_ADAPTER);

    // Check session status
    const session = await yellowAdapter.getSession(signer.address);
    console.log("\n📋 Session Details:");
    console.log("  User:", session.user);
    console.log("  Deposit:", ethers.formatEther(session.deposit), "ETH");
    console.log("  Spent:", ethers.formatEther(session.spent), "ETH");
    console.log("  Nonce:", session.nonce.toString());
    console.log("  Expiry:", new Date(Number(session.expiry) * 1000).toLocaleString());
    console.log("  Active:", session.active);

    const isActive = await yellowAdapter.isSessionActive(signer.address);
    console.log("\n⚡ Is Session Currently Active:", isActive);

    if (session.active) {
        console.log("\n⚠️  You have an active session!");
        console.log("   This is why 'openSession' is failing.");
        console.log("   Run: npx hardhat run scripts/close-session.js --network sepolia");
    } else {
        console.log("\n✅ No active session. You can open a new one.");
    }
}

main().catch(console.error);
