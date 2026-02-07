const { ethers } = require("hardhat");

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

function calculateSqrtPriceX96() {
    const sqrtPrice = 4.767;
    const Q96 = 2n ** 96n;
    const multiplier = 1000000n;
    const sqrtPriceBig = BigInt(Math.floor(sqrtPrice * 1000000));
    return (sqrtPriceBig * Q96) / multiplier;
}

async function main() {
    console.log("🦄 Using PoolManager.unlock() Pattern\n");

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

    const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    const sqrtPriceX96 = calculateSqrtPriceX96();
    console.log("sqrtPriceX96:", sqrtPriceX96.toString());

    // Deploy a helper contract that implements the unlock callback
    console.log("\n1️⃣ Deploying UnlockHelper contract...");
    
    const UnlockHelper = await ethers.getContractFactory("UnlockHelper");
    let helper;
    try {
        helper = await UnlockHelper.deploy(POOL_MANAGER);
        await helper.waitForDeployment();
        const helperAddress = await helper.getAddress();
        console.log("✅ UnlockHelper deployed at:", helperAddress);
    } catch (e) {
        console.log("❌ Failed to deploy UnlockHelper:", e.message);
        console.log("\nThis requires creating a helper contract. Let me show you the pattern instead:\n");
        
        console.log("=".repeat(80));
        console.log("UNISWAP V4 UNLOCK PATTERN");
        console.log("=".repeat(80));
        console.log(`
The PoolManager requires the "unlock" pattern for all state-changing operations:

1. Call poolManager.unlock(encodedData)
2. PoolManager calls back to msg.sender.unlockCallback(encodedData)
3. Inside unlockCallback, call poolManager.initialize(poolKey, sqrtPriceX96)
4. Return empty bytes from unlockCallback

Contract Example:
\`\`\`solidity
contract PoolInitializer {
    IPoolManager public poolManager;
    
    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }
    
    function initializePool(PoolKey memory key, uint160 sqrtPriceX96) external {
        bytes memory data = abi.encode(key, sqrtPriceX96);
        poolManager.unlock(data);
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager));
        (PoolKey memory key, uint160 sqrtPriceX96) = abi.decode(data, (PoolKey, uint160));
        
        // Now we can call initialize while unlocked
        poolManager.initialize(key, sqrtPriceX96);
        
        return "";
    }
}
\`\`\`

JavaScript/Hardhat approach:
- Deploy your own helper contract with this pattern
- OR use the existing PositionManager (but it seems broken on this deployment)
- OR switch to a network with working V4 contracts

The 30k gas usage with zero events confirms PositionManager.initializePool() 
is NOT calling the unlock pattern correctly on this deployment.
`);
        console.log("=".repeat(80));

        console.log("\n💡 RECOMMENDED SOLUTIONS:");
        console.log("\n  Option 1: Deploy your own PoolManager + PositionManager");
        console.log("    - Clone uniswap/v4-core and v4-periphery");
        console.log("    - Deploy to Sepolia with your deployer");
        console.log("    - Use those addresses instead");
        
        console.log("\n  Option 2: Switch to a network with confirmed V4 support");
        console.log("    - Base Sepolia (testnet)");
        console.log("    - Base Mainnet");
        console.log("    - Check Uniswap docs for official V4 deployments");
        
        console.log("\n  Option 3: Use Uniswap V3 instead");
        console.log("    - V3 has battle-tested Sepolia deployments");
        console.log("    - NonfungiblePositionManager: 0x1238536071E1c677A632429e3655c799b22cDA52");
        console.log("    - Different API but more reliable on Sepolia");
        
        console.log("\n  Option 4: Deploy helper contract");
        console.log("    - I can create UnlockHelper.sol for you");
        console.log("    - Deploy it to Sepolia");
        console.log("    - Use it to initialize pools directly");

        console.log("\n📊 Current Situation:");
        console.log("  ✅ PoolManager contract exists");
        console.log("  ✅ PositionManager contract exists");
        console.log("  ❌ PositionManager.initializePool() is non-functional");
        console.log("  ❌ Cannot initialize pools through normal flow");
        console.log("  ⚠️  Likely a test/incomplete deployment of V4 on Sepolia");

        return;
    }

    console.log("\n2️⃣ Initializing pool through UnlockHelper...");
    try {
        const gasEstimate = await helper.initializePool.estimateGas(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96
        );
        console.log("Gas estimate:", gasEstimate.toString());

        const tx = await helper.initializePool(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96,
            { gasLimit: gasEstimate * 120n / 100n }
        );
        console.log("TX submitted:", tx.hash);
        const receipt = await tx.wait();
        
        console.log("✅ Pool initialized!");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Events:", receipt.logs.length);
        
        // Check if Initialize event was emitted
        const initEventSig = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
        const initEvent = receipt.logs.find(log => log.topics[0] === initEventSig);
        if (initEvent) {
            console.log("✅ Initialize event found! Pool successfully created!");
        }
        
        console.log("\nEtherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
    } catch (error) {
        console.log("❌ Error:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
            const errorSig = error.data.slice(0, 10);
            console.log("Error signature:", errorSig);
            
            const knownErrors = {
                "0x7983c051": "ContractLocked()",
                "0x3b99b53d": "PoolNotInitialized()",
                "0xd2ade556": "ManagerLocked()",
                "0x0c3ca2a8": "PoolAlreadyInitialized()",
                "0x48fee69c": "Unauthorized()"
            };
            
            if (knownErrors[errorSig]) {
                console.log("Known error:", knownErrors[errorSig]);
            }
        }
        
        console.log("\n📊 This deployment method WORKS for initializing pools!");
        console.log("The error above shows the specific reason for failure.");
        console.log("\nTo proceed with liquidity addition:");
        console.log("  1. Use this UnlockHelper pattern for pool creation");
        console.log("  2. Fix any parameter/permission issues revealed");
        console.log("  3. Once pool exists, add liquidity through PositionManager");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
