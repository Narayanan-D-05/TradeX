const { ethers } = require("hardhat");
require("dotenv").config();

const YELLOW_ADAPTER = process.env.YELLOW_ADAPTER || "0xF23584D7b593Cf4ba12d775C1C3E93C4D5342356";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Closing session for:", signer.address);

    const yellowAdapter = await ethers.getContractAt("YellowAdapter", YELLOW_ADAPTER);

    // Check if session is active
    const isActive = await yellowAdapter.isSessionActive(signer.address);

    if (!isActive) {
        console.log("❌ No active session to close.");
        return;
    }

    console.log("🔄 Closing session...");
    const tx = await yellowAdapter.closeSession();
    console.log("📝 Transaction:", tx.hash);

    await tx.wait();
    console.log("✅ Session closed! Any remaining deposit has been refunded.");
}

main().catch(console.error);
