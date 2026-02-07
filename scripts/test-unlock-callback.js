const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const [deployer] = await ethers.getSigners();
    const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
    const AED_STABLE = "0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c";
    const INR_STABLE = "0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41";

    const poolKey = {
        currency0: AED_STABLE,
        currency1: INR_STABLE,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };
    
    // Price: 1 AED = 22.727 INR
    const sqrtPriceX96 = "377680650705498097308424011251";

    console.log("🔬 Testing PoolManager Initialize with Real Parameters\n");
    console.log("Deployer:", deployer.address);
    console.log("Currency0 (AED):", poolKey.currency0);
    console.log("Currency1 (INR):", poolKey.currency1);
    console.log("Fee:", poolKey.fee);
    console.log("TickSpacing:", poolKey.tickSpacing);
    console.log("sqrtPriceX96:", sqrtPriceX96);

    // Deploy the test contract
    console.log("\n1️⃣ Deploying SimpleUnlockTest...");
    const SimpleUnlockTest = await ethers.getContractFactory("SimpleUnlockTest");
    const tester = await SimpleUnlockTest.deploy(POOL_MANAGER);
    await tester.waitForDeployment();
    const testerAddress = await tester.getAddress();
    
    console.log("✅ Deployed at:", testerAddress);

    // Test initialization
    console.log("\n2️⃣ Testing pool initialization...");
    try {
        const tx = await tester.testInitialize(
            poolKey.currency0,
            poolKey.currency1,
            poolKey.fee,
            poolKey.tickSpacing,
            poolKey.hooks,
            sqrtPriceX96
        );
        const receipt = await tx.wait();
        
        console.log("✅ Transaction succeeded!");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Events:", receipt.logs.length);
        
        // Check if there was an error
        const lastError = await tester.lastError();
        if (lastError) {
            console.log("\n❌ Initialize failed with error:", lastError);
        } else {
            console.log("\n✅ Pool initialized successfully!");
        }
        
        // Look for Initialize event
        const initEventSig = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
        const initEvent = receipt.logs.find(log => log.topics[0] === initEventSig);
        if (initEvent) {
            console.log("✅ Initialize event found - pool created!");
        }
        
        console.log("\nEtherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
    } catch (error) {
        console.log("❌ Transaction reverted:", error.message);
        
        if (error.data) {
            console.log("Error data:", error.data);
            const errorSig = error.data.slice(0, 10);
            console.log("Error signature:", errorSig);
            
            const knownErrors = {
                "0x0c3ca2a8": "PoolAlreadyInitialized()",
                "0x48fee69c": "Unauthorized()",
                "0x7983c051": "ContractLocked()",
                "0xd2ade556": "ManagerLocked()"
            };
            
            if (knownErrors[errorSig]) {
                console.log("Known error:", knownErrors[errorSig]);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
