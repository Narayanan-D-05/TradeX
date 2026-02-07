const { ethers } = require("hardhat");

const CUSTOM_MANAGER = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd";

async function main() {
    console.log("Checking code at:", CUSTOM_MANAGER);
    const code = await ethers.provider.getCode(CUSTOM_MANAGER);
    console.log("Code length:", code.length);
    if (code === "0x") {
        console.log("❌ No code found at address!");
    } else {
        console.log("✅ Code found.");
    }
}

main().catch(console.error);
