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

// Pool parameters
const FEE = 3000;  // 0.3%
const TICK_SPACING = 60;
const SQRT_PRICE_X96 = "377680650705498097308424011251"; // 1 AED = 22.727 INR

const POOL_MANAGER_ABI = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)"
];

async function main() {
    console.log("\n🎯 \x1b[36mDIRECT POOL INITIALIZATION - AED/INR on Base Sepolia\x1b[0m\n");

    if (!PRIVATE_KEY) {
        console.error("❌ Error: No private key found in .env");
        console.error("   Please set DEPLOYER_PRIVATE_KEY in your .env file");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`🦊 Wallet: ${wallet.address}`);
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

    if (ethBalance < ethers.parseEther("0.001")) {
        console.log(`⚠️  Warning: Low ETH balance. You need ETH for gas.`);
        console.log(`   Get some from: https://www.alchemy.com/faucets/base-sepolia\n`);
    }

    // Construct pool key (currency0 < currency1)
    const isAED0 = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase();
    const poolKey = {
        currency0: isAED0 ? AED_TOKEN : INR_TOKEN,
        currency1: isAED0 ? INR_TOKEN : AED_TOKEN,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: ethers.ZeroAddress
    };

    console.log(`🔑 Pool Configuration:`);
    console.log(`   currency0 (${isAED0 ? 'AED' : 'INR'}): ${poolKey.currency0}`);
    console.log(`   currency1 (${isAED0 ? 'INR' : 'AED'}): ${poolKey.currency1}`);
    console.log(`   fee: ${poolKey.fee} (0.3%)`);
    console.log(`   tickSpacing: ${poolKey.tickSpacing}`);
    console.log(`   hooks: ${poolKey.hooks}\n`);

    // Calculate Pool ID
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log(`🆔 Pool ID: ${poolId}\n`);

    // Connect to PoolManager
    const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, wallet);

    console.log(`📡 Initializing pool...`);
    console.log(`   Target Price: 1 AED = 22.727 INR`);
    console.log(`   sqrtPriceX96: ${SQRT_PRICE_X96}\n`);

    try {
        // Estimate gas first
        console.log(`⚙️  Estimating gas...`);
        const gasEstimate = await poolManager.initialize.estimateGas(
            poolKey,
            SQRT_PRICE_X96,
            "0x"
        );
        console.log(`   Estimated: ${gasEstimate.toString()} gas\n`);

        // Send transaction
        const tx = await poolManager.initialize(
            poolKey,
            SQRT_PRICE_X96,
            "0x",
            { 
                gasLimit: gasEstimate * 120n / 100n  // 20% buffer
            }
        );

        console.log(`✅ Transaction sent!`);
        console.log(`   Hash: ${tx.hash}`);
        console.log(`   BaseScan: https://sepolia.basescan.org/tx/${tx.hash}\n`);
        
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();

        console.log(`\n🎉 \x1b[32mPOOL SUCCESSFULLY INITIALIZED!\x1b[0m`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}\n`);

        if (receipt.status === 1) {
            console.log(`📋 Next Steps:`);
            console.log(`   1. Run: npx hardhat run scripts/add-liquidity-v4-router.js --network baseSepolia`);
            console.log(`   2. Or use the PositionManager to add liquidity`);
            console.log(`   3. Test swaps on your frontend!\n`);
        }

    } catch (error) {
        console.log(`\n❌ \x1b[31mINITIALIZATION FAILED\x1b[0m`);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.log(`\n🔍 Possible reasons:`);
            console.log(`   1. Pool already initialized by someone else`);
            console.log(`   2. Invalid pool parameters`);
            console.log(`   3. Hook validation failed`);
            console.log(`   4. Insufficient gas`);
            
            // Try to get more details
            if (error.data) {
                console.log(`\n   Error data: ${error.data}`);
            }
            if (error.reason) {
                console.log(`   Reason: ${error.reason}`);
            }
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log(`\n💸 You need more ETH for gas!`);
            console.log(`   Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia`);
        } else {
            console.log(`\n   Error: ${error.message}`);
        }
        
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
});
