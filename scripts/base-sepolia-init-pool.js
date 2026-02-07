const hre = require("hardhat");
const ethers = hre.ethers;

// UPDATE THESE AFTER DEPLOYING TOKENS
const AED_STABLE = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_STABLE = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

const POOL_MANAGER = ethers.getAddress("0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("🦄 Initializing Uniswap V4 Pool on Base Sepolia\n");
    console.log("Deployer:", deployer.address);

    if (AED_STABLE === "YOUR_AED_ADDRESS_HERE") {
        console.log("\n❌ Error: Update token addresses in this script first!");
        console.log("   Run: npx hardhat run scripts/deploy-tokens-base-sepolia.js --network baseSepolia");
        console.log("   Then update AED_STABLE and INR_STABLE addresses in this file");
        return;
    }

    // Ensure addresses are properly formatted
    const aed = ethers.getAddress(AED_STABLE);
    const inr = ethers.getAddress(INR_STABLE);

    // Determine currency0 and currency1 (must be sorted)
    const [currency0, currency1] = BigInt(aed) < BigInt(inr) ? [aed, inr] : [inr, aed];
    const currency0IsAED = currency0 === aed;

    console.log("\nCurrency0:", currency0, currency0IsAED ? "(AED)" : "(INR)");
    console.log("Currency1:", currency1, currency0IsAED ? "(INR)" : "(AED)");

    // Pool parameters
    const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000, // 0.3%
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Price: 1 AED = 22.727 INR
    // sqrtPriceX96 = sqrt(price) * 2^96
    // If currency0 is AED: price = 22.727, sqrtPriceX96 = sqrt(22.727) * 2^96
    // If currency0 is INR: price = 1/22.727 = 0.044, sqrtPriceX96 = sqrt(0.044) * 2^96
    const sqrtPriceX96 = currency0IsAED
        ? "377680650705498097308424011251"  // sqrt(22.727) * 2^96
        : "16611469732845883274625687481";   // sqrt(1/22.727) * 2^96

    console.log("sqrtPriceX96:", sqrtPriceX96);

    // Deploy UnlockHelper
    console.log("\n1️⃣ Deploying UnlockHelper...");
    const UnlockHelper = await ethers.getContractFactory("UnlockHelper");
    const helper = await UnlockHelper.deploy(POOL_MANAGER);
    await helper.waitForDeployment();
    const helperAddress = await helper.getAddress();
    
    console.log("✅ UnlockHelper deployed:", helperAddress);

    // Initialize pool through UnlockHelper
    console.log("\n2️⃣ Initializing pool...");
    try {
        const tx = await helper.initializePool(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96,
            { gasLimit: 500000 }
        );
        console.log("TX submitted:", tx.hash);
        const receipt = await tx.wait();
        
        console.log("✅ Pool initialized!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Check for Initialize event
        const initEventSig = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
        const initEvent = receipt.logs.find(log => log.topics[0] === initEventSig);
        
        if (initEvent) {
            console.log("✅ Initialize event found - pool successfully created!");
            
            // Calculate and show pool ID
            const poolId = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address", "address", "uint24", "int24", "address"],
                    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
                )
            );
            console.log("\n📊 Pool Details:");
            console.log("Pool ID:", poolId);
            console.log("UnlockHelper:", helperAddress);
            
            console.log("\n🔍 View on BaseScan:");
            console.log(`https://sepolia.basescan.org/tx/${tx.hash}`);
            
            console.log("\n📝 Next step: Add liquidity");
            console.log("   Update pool details in scripts/base-sepolia-add-liquidity.js");
        } else {
            console.log("⚠️  No Initialize event - check transaction on BaseScan");
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
