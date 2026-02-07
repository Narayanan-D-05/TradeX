const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.MAIN_WALLET_PRIVATE_KEY;
const RPC_URL = "https://sepolia.base.org";

// Official Uniswap V4 contracts on Base Sepolia
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

// Try different tick spacings - V4 has specific requirements
const TEST_CONFIGS = [
    { fee: 100, tickSpacing: 1, desc: "0.01% fee, tick spacing 1" },
    { fee: 500, tickSpacing: 10, desc: "0.05% fee, tick spacing 10" },
    { fee: 3000, tickSpacing: 60, desc: "0.3% fee, tick spacing 60" },
    { fee: 10000, tickSpacing: 200, desc: "1% fee, tick spacing 200" },
];

const SQRT_PRICE_X96 = "377680650705498097308424011251"; // 1 AED = 22.727 INR

const POOL_MANAGER_ABI = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)"
];

async function main() {
    console.log("\n🧪 TESTING DIFFERENT TICK SPACINGS\n");

    if (!PRIVATE_KEY) {
        console.error("❌ Error: No private key found");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`🦊 Wallet: ${wallet.address}\n`);

    const isAED0 = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase();
    const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet);

    console.log(`🎯 Testing ${TEST_CONFIGS.length} different fee/tick spacing combinations...\n`);

    for (const config of TEST_CONFIGS) {
        console.log(`\n📝 Testing: ${config.desc}`);
        
        const poolKey = {
            currency0: isAED0 ? AED_TOKEN : INR_TOKEN,
            currency1: isAED0 ? INR_TOKEN : AED_TOKEN,
            fee: config.fee,
            tickSpacing: config.tickSpacing,
            hooks: ethers.ZeroAddress
        };

        const poolId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "address", "uint24", "int24", "address"],
                [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
            )
        );
        console.log(`   Pool ID: ${poolId.substring(0, 10)}...${poolId.substring(62)}`);

        try {
            // Try static call first (doesn't consume gas)
            await poolManager.initialize.staticCall(
                poolKey,
                SQRT_PRICE_X96,
                "0x"
            );
            
            console.log(`   ✅ Static call PASSED! This config should work!`);
            console.log(`\n🎉 FOUND WORKING CONFIGURATION!`);
            console.log(`   Fee: ${config.fee} (${config.fee / 10000}%)`);
            console.log(`   Tick Spacing: ${config.tickSpacing}`);
            console.log(`\n   Do you want to initialize with these parameters? (Y/n)`);
            
            // Actually send the transaction
            console.log(`\n   Initializing pool with fee=${config.fee}, tickSpacing=${config.tickSpacing}...`);
            const tx = await poolManager.initialize(
                poolKey,
                SQRT_PRICE_X96,
                "0x",
                { gasLimit: 500000 }
            );
            
            console.log(`   Tx: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Pool initialized successfully!`);
            
            return; // Exit on success
            
        } catch (error) {
            if (error.code === 'CALL_EXCEPTION') {
                console.log(`   ❌ Failed: ${error.reason || 'execution reverted'}`);
            } else {
                console.log(`   ❌ Failed: ${error.message.split('\n')[0]}`);
            }
        }
    }

    console.log(`\n\n❌ None of the standard tick spacing configurations worked.`);
    console.log(`\n🤔 This suggests a different issue. Possible causes:`);
    console.log(`   1. PoolManager has restrictions on who can initialize pools`);
    console.log(`   2. Token addresses need to be sorted/validated differently`);
    console.log(`   3. Base Sepolia deployment may have different requirements`);
    console.log(`   4. Need to use PoolModifyLiquidityTest or different initialization method`);
}

main().catch(console.error);
