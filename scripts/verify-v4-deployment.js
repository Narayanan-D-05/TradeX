const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
    const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

    console.log("🔍 Verifying Uniswap V4 Contract Deployments on Sepolia\n");

    // Check PoolManager
    console.log("PoolManager:", POOL_MANAGER);
    const pmCode = await ethers.provider.getCode(POOL_MANAGER);
    console.log("  Has code:", pmCode.length > 2);
    console.log("  Code size:", pmCode.length, "chars");
    console.log("  Code preview:", pmCode.slice(0, 66));

    // Check PositionManager
    console.log("\nPositionManager:", POSITION_MANAGER);
    const posCode = await ethers.provider.getCode(POSITION_MANAGER);
    console.log("  Has code:", posCode.length > 2);
    console.log("  Code size:", posCode.length, "chars");
    console.log("  Code preview:", posCode.slice(0, 66));

    // Try to call a read-only function on PoolManager
    console.log("\n📞 Testing PoolManager interface...");
    
    const poolManagerAbi = [
        "function protocolFeesAccrued(address currency) external view returns (uint256)",
        "function extsload(bytes32 slot) external view returns (bytes32)"
    ];
    
    const poolManager = new ethers.Contract(POOL_MANAGER, poolManagerAbi, ethers.provider);
    
    try {
        // Try to read a storage slot
        const slot0 = await poolManager.extsload("0x0000000000000000000000000000000000000000000000000000000000000000");
        console.log("  ✅ extsload(0) works:", slot0);
    } catch (error) {
        console.log("  ❌ extsload() not available");
    }

    console.log("\n📚 Official Uniswap V4 Deployment Info:");
    console.log("  Docs: https://docs.uniswap.org/contracts/v4/deployments");
    console.log("  GitHub: https://github.com/Uniswap/v4-core");
    console.log("\n⚠️  Sepolia testnet deployments may be experimental/incomplete");
    console.log("   Consider using Base Sepolia or Base Mainnet for production testing");
    console.log("\n💡 The ContractLocked error when calling initialize from unlockCallback");
    console.log("   suggests this PoolManager deployment has a locking bug or uses");
    console.log("   a different interface than the standard V4 specification.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
