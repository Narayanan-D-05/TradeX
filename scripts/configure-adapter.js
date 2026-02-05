const { ethers } = require("hardhat");
require("dotenv").config();

const YELLOW_ADAPTER = process.env.NEXT_PUBLIC_YELLOW_ADAPTER || "0xF23584D7b593Cf4ba12d775C1C3E93C4D5342356";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Updating YellowAdapter settings with account:", deployer.address);

    const yellowAdapter = await ethers.getContractAt("YellowAdapter", YELLOW_ADAPTER);

    // 1. Lower Minimum Deposit to 0.01 ETH
    console.log("📉 Lowering minimum deposit to 0.01 ETH...");
    const tx = await yellowAdapter.setMinDeposit(ethers.parseEther("0.01"));
    await tx.wait();
    console.log("✅ Minimum deposit updated to 0.01 ETH");

    // Verify
    const newMin = await yellowAdapter.minDeposit();
    console.log("New Min Deposit:", ethers.formatEther(newMin), "ETH");
}

main().catch(console.error);
