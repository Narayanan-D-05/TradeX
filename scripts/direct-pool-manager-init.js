const { ethers } = require("hardhat");

// Uniswap V4 addresses - let's verify these are correct
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

function calculateSqrtPriceX96() {
    // sqrt(22.727) * 2^96
    const sqrtPrice = 4.767;
    const Q96 = 2n ** 96n;
    const multiplier = 1000000n;
    const sqrtPriceBig = BigInt(Math.floor(sqrtPrice * 1000000));
    return (sqrtPriceBig * Q96) / multiplier;
}

async function main() {
    console.log("🔍 Direct PoolManager Initialization Test\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const deployment = require("../deployments/sepolia-deployment.json");
    const AED_STABLE = deployment.contracts.AED_STABLE;
    const INR_STABLE = deployment.contracts.INR_STABLE;

    const [currency0, currency1] = BigInt(AED_STABLE) < BigInt(INR_STABLE)
        ? [AED_STABLE, INR_STABLE]
        : [INR_STABLE, AED_STABLE];

    console.log("Currency0 (AED):", currency0);
    console.log("Currency1 (INR):", currency1);

    // 1️⃣ Verify contract addresses
    console.log("\n1️⃣ Verifying Contract Addresses:");
    console.log("PoolManager:", POOL_MANAGER);
    console.log("PositionManager:", POSITION_MANAGER);

    try {
        // Check if contracts exist
        const pmCode = await ethers.provider.getCode(POOL_MANAGER);
        const posmCode = await ethers.provider.getCode(POSITION_MANAGER);
        
        console.log("PoolManager has code:", pmCode.length > 2);
        console.log("PositionManager has code:", posmCode.length > 2);
        
        if (pmCode === "0x" || pmCode === "0x0") {
            console.log("❌ ERROR: PoolManager address has no code! Wrong address.");
            return;
        }
    } catch (e) {
        console.log("Error checking contracts:", e.message);
    }

    // 2️⃣ Try to call PoolManager.initialize directly
    console.log("\n2️⃣ Calling PoolManager.initialize() directly:");
    
    const poolManager = await ethers.getContractAt(
        [
            "function initialize((address,address,uint24,int24,address),uint160) external returns (int24)",
            "function unlock(bytes) external returns (bytes)",
            "function getSlot0(bytes32) external view returns (uint160,int24)"
        ],
        POOL_MANAGER
    );

    const sqrtPriceX96 = calculateSqrtPriceX96();
    console.log("sqrtPriceX96:", sqrtPriceX96.toString());

    // Construct PoolKey struct
    const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Calculate pool ID
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log("Pool ID:", poolId);

    // Check current pool state
    console.log("\n3️⃣ Checking current pool state:");
    try {
        const [sqrtPrice, tick] = await poolManager.getSlot0(poolId);
        console.log("Current sqrtPrice:", sqrtPrice.toString());
        console.log("Pool exists:", sqrtPrice > 0n);
        
        if (sqrtPrice > 0n) {
            console.log("\n✅ Pool already exists! No need to initialize.");
            console.log("You can proceed directly to adding liquidity.");
            return;
        }
    } catch (e) {
        console.log("Pool check error:", e.message);
        console.log("(This is expected if pool doesn't exist)");
    }

    // 4️⃣ Try direct initialization
    console.log("\n4️⃣ Attempting direct PoolManager.initialize():");
    try {
        console.log("Estimating gas...");
        const gasEstimate = await poolManager.initialize.estimateGas(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96
        );
        console.log("Gas estimate:", gasEstimate.toString());

        console.log("Sending transaction...");
        const tx = await poolManager.initialize(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96,
            { gasLimit: gasEstimate * 120n / 100n }
        );

        console.log("TX hash:", tx.hash);
        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log("\n✅ Transaction mined!");
        console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Events emitted:", receipt.logs.length);
        
        // Parse Initialize event
        const initTopic = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
        const initLog = receipt.logs.find(log => log.topics[0] === initTopic);
        
        if (initLog) {
            console.log("✅ Initialize event found!");
            console.log("Pool successfully created!");
        } else {
            console.log("❌ No Initialize event found - pool may not be created");
        }

        console.log("\nEtherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);

    } catch (error) {
        console.log("\n❌ Direct initialization failed:");
        console.log("Error:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
            
            // Try to decode error
            if (error.data.startsWith("0x")) {
                const errorSig = error.data.slice(0, 10);
                console.log("Error signature:", errorSig);
                
                const knownErrors = {
                    "0x7983c051": "PoolManager: ContractLocked()",
                    "0x3b99b53d": "Pool.PoolNotInitialized()",
                    "0xd2ade556": "PoolManager: ManagerLocked()",
                    "0x48fee69c": "Unauthorized()"
                };
                
                if (knownErrors[errorSig]) {
                    console.log("Known error:", knownErrors[errorSig]);
                    
                    if (errorSig === "0x7983c051") {
                        console.log("\n💡 Suggestion: PoolManager is locked.");
                        console.log("   You must call initialize() through the unlock callback.");
                        console.log("   Use PositionManager.initializePool() or implement unlock pattern.");
                    }
                }
            }
        }
        
        console.log("\n5️⃣ Alternative: Using unlock pattern");
        console.log("Since direct call failed, initialization must happen during unlock callback.");
        console.log("This is why PositionManager.initializePool() exists - it handles the unlock.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
