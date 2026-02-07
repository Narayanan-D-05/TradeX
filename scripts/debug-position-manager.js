const { ethers } = require("hardhat");

const POSITION_MANAGER = "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Signer:", deployer.address);

    // 1. Check PERMIT2 constant on PositionManager
    try {
        const pm = await ethers.getContractAt("V4LiquidityManager", POSITION_MANAGER); // Using generic name but checking for specific function
        // Try to get canonical PERMIT2 if it exists
        // Most V4 PositionManagers have immutable PERMIT2
        // We'll try to read it.

        // We don't have the ABI, let's try to call it blindly
        const pmRaw = new ethers.Contract(POSITION_MANAGER, ["function PERMIT2() view returns (address)", "function poolManager() view returns (address)"], deployer);

        try {
            const permit2Params = await pmRaw.PERMIT2();
            console.log("PositionManager.PERMIT2():", permit2Params);
        } catch (e) {
            console.log("Could not read PERMIT2() from PositionManager. It might not be public or named differently.");
        }

        try {
            const pmAddr = await pmRaw.poolManager();
            console.log("PositionManager.poolManager():", pmAddr);
        } catch (e) {
            console.log("Could not read poolManager() from PositionManager.");
        }

    } catch (e) {
        console.log("Error checking PositionManager:", e.message);
    }

    // 2. Check Permit2 Allowances
    const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const permit2 = new ethers.Contract(PERMIT2_ADDRESS, [
        "function allowance(address user, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)"
    ], deployer);

    console.log("\nChecking Permit2 Allowances for Signer -> PositionManager:");

    const [amountAed, expirationAed] = await permit2.allowance(deployer.address, AED_TOKEN, POSITION_MANAGER);
    console.log("AED Allowance:", amountAed.toString(), "Expiration:", expirationAed.toString());

    const [amountInr, expirationInr] = await permit2.allowance(deployer.address, INR_TOKEN, POSITION_MANAGER);
    console.log("INR Allowance:", amountInr.toString(), "Expiration:", expirationInr.toString());

    // 3. Check Token Approvals to Permit2
    const aed = await ethers.getContractAt("MockERC20", AED_TOKEN);
    const inr = await ethers.getContractAt("MockERC20", INR_TOKEN);

    console.log("\nChecking Token Approvals to Permit2:");
    const aedApp = await aed.allowance(deployer.address, PERMIT2_ADDRESS);
    console.log("AED -> Permit2:", ethers.formatUnits(aedApp, 6));

    const inrApp = await inr.allowance(deployer.address, PERMIT2_ADDRESS);
    console.log("INR -> Permit2:", ethers.formatUnits(inrApp, 6));

}

main().catch(console.error);
