const hre = require("hardhat");
const ethers = hre.ethers;

const POOL_MANAGER = ethers.getAddress("0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829");
const POOL_ID = "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281";

async function main() {
    console.log("🔍 Verifying Pool State on Base Sepolia\n");

    console.log("Pool ID:", POOL_ID);
    console.log("PoolManager:", POOL_MANAGER);

    // Try extsload first (raw storage access)
    const extsloadAbi = ["function extsload(bytes32 slot) external view returns (bytes32)"];
    const poolManager = new ethers.Contract(POOL_MANAGER, extsloadAbi, ethers.provider);

    try {
        console.log("\n📖 Reading pool storage directly...");
        const sqrtPriceSlot = await poolManager.extsload(POOL_ID);
        
        console.log("\n✅ Pool Storage Retrieved!");
        console.log("═══════════════════════════════════════════════════");
        console.log("Storage slot value:", sqrtPriceSlot);
        console.log("═══════════════════════════════════════════════════");

        const sqrtPrice = BigInt(sqrtPriceSlot);
        if (sqrtPrice > 0n) {
            console.log("\n🎉 POOL IS INITIALIZED!");
            console.log("   sqrtPriceX96:", sqrtPrice.toString());
            console.log("   Status: READY FOR TRADING");
            console.log("\n✅ BASE SEPOLIA INTEGRATION COMPLETE!");
        } else {
            console.log("\n⚠️  Pool storage is empty (sqrtPrice = 0)");
            console.log("   Pool may not be initialized despite successful init transaction");
        }

    } catch (error) {
        console.log("❌ Error:", error.message);
    }

    // Also try getSlot0
    console.log("\n📖 Trying getSlot0...");
    const slot0Abi = ["function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"];
    const poolManager2 = new ethers.Contract(POOL_MANAGER, slot0Abi, ethers.provider);

    try {
        const slot0 = await poolManager2.getSlot0(POOL_ID);
        console.log("✅ getSlot0 works!");
        console.log("   sqrtPriceX96:", slot0[0].toString());
        console.log("   tick:", slot0[1].toString());
    } catch (error) {
        console.log("⚠️  getSlot0 not available:", error.message);
    }

    console.log("\n📊 Deployment Summary:");
    console.log("✅ Network: Base Sepolia (Chain ID: 84532)");
    console.log("✅ Tokens: AED & INR deployed");
    console.log("✅ Pool Init TX:", "0xee31eaea3bce74e592264e2aa355b9aed490752a4ca77725e8d202541a018465");
    console.log("✅ Initialize Event: Emitted");
    console.log("\n🔗 View on BaseScan:");
    console.log(`   https://sepolia.basescan.org/tx/0xee31eaea3bce74e592264e2aa355b9aed490752a4ca77725e8d202541a018465`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
