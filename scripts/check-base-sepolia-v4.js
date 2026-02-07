const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    console.log("🔍 Checking Uniswap V4 on Base Sepolia\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Base Sepolia Uniswap V4 addresses
    // Source: https://docs.uniswap.org/contracts/v4/deployments
    const V4_ADDRESSES = {
        POOL_MANAGER: ethers.getAddress("0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829"),
        POSITION_MANAGER: ethers.getAddress("0xb673ae3a4d1c085d7ce3d4c1f7de9d42b47d7e8e"),
        PERMIT2: ethers.getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
    };

    console.log("\n📍 Contract Addresses:");
    console.log("  PoolManager:", V4_ADDRESSES.POOL_MANAGER);
    console.log("  PositionManager:", V4_ADDRESSES.POSITION_MANAGER);
    console.log("  Permit2:", V4_ADDRESSES.PERMIT2);

    // Check if contracts exist
    console.log("\n🔍 Verifying deployments...");
    
    for (const [name, address] of Object.entries(V4_ADDRESSES)) {
        const code = await ethers.provider.getCode(address);
        const exists = code.length > 2;
        console.log(`  ${name}: ${exists ? '✅' : '❌'} (${exists ? code.length + ' bytes' : 'not deployed'})`);
        
        if (!exists && name !== "PERMIT2") {
            console.log(`\n⚠️  ${name} not found at ${address}`);
            console.log("    You may need to:");
            console.log("    1. Check official Uniswap V4 docs for correct Base Sepolia addresses");
            console.log("    2. Deploy your own V4 instance");
            console.log("    3. Use a different testnet");
        }
    }

    // Test unlock callback
    if ((await ethers.provider.getCode(V4_ADDRESSES.POOL_MANAGER)).length > 2) {
        console.log("\n🧪 Testing PoolManager unlock callback...");
        const poolManagerAbi = ["function unlock(bytes calldata data) external returns (bytes memory)"];
        const poolManager = new ethers.Contract(V4_ADDRESSES.POOL_MANAGER, poolManagerAbi, deployer);
        
        try {
            // Just estimate gas to see if the function exists
            const estimate = await poolManager.unlock.estimateGas("0x");
            console.log("  ✅ unlock() function exists (gas estimate:", estimate.toString() + ")");
        } catch (error) {
            if (error.message.includes("function selector was not recognized")) {
                console.log("  ❌ unlock() function not found - wrong address or different interface");
            } else {
                console.log("  ⚠️  unlock() exists but reverted (expected) - interface correct!");
            }
        }
    }

    console.log("\n📚 Next Steps:");
    console.log("  1. Verify addresses at: https://docs.uniswap.org/contracts/v4/deployments");
    console.log("  2. Deploy tokens to Base Sepolia (AED_STABLE, INR_STABLE)");
    console.log("  3. Initialize pool using scripts/base-sepolia-init-pool.js");
    console.log("  4. Add liquidity using scripts/base-sepolia-add-liquidity.js");
    
    console.log("\n🌐 Base Sepolia Explorer:");
    console.log("  https://sepolia.basescan.org/address/" + deployer.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
