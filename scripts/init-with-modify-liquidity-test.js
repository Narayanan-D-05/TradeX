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

// Official Uniswap V4 testnet contracts on Base Sepolia
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const POOL_MODIFY_LIQUIDITY_TEST = "0x37429cd17cb1454c34e7f50b09725202fd533039"; // Official testnet helper
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

const FEE = 3000;  // 0.3%
const TICK_SPACING = 60;
const SQRT_PRICE_X96 = "377680650705498097308424011251"; // 1 AED = 22.727 INR

const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// PoolModifyLiquidityTest ABI - combines initialize + modifyLiquidity
const POOL_MODIFY_TEST_ABI = [
    "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns (int256, int256)"
];

async function main() {
    console.log("\n🧪 \x1b[36mUSING UNISWAP'S PoolModifyLiquidityTest CONTRACT\x1b[0m\n");
    console.log("This official testnet contract can initialize pools AND add liquidity!\n");

    if (!PRIVATE_KEY) {
        console.error("❌ Error: No private key found");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`🦊 Wallet: ${wallet.address}`);
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

    // Token contracts
    const aed = new ethers.Contract(AED_TOKEN, ERC20_ABI, wallet);
    const inr = new ethers.Contract(INR_TOKEN, ERC20_ABI, wallet);
    
    // Check balances
    const [aedBal, inrBal, aedDec, inrDec] = await Promise.all([
        aed.balanceOf(wallet.address),
        inr.balanceOf(wallet.address),
        aed.decimals(),
        inr.decimals()
    ]);

    console.log(`💰 Token Balances:`);
    console.log(`   AED: ${ethers.formatUnits(aedBal, aedDec)}`);
    console.log(`   INR: ${ethers.formatUnits(inrBal, inrDec)}\n`);

    // Construct pool key
    const isAED0 = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase();
    const poolKey = {
        currency0: isAED0 ? AED_TOKEN : INR_TOKEN,
        currency1: isAED0 ? INR_TOKEN : AED_TOKEN,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: ethers.ZeroAddress
    };

    console.log(`🔑 Pool Key:`);
    console.log(`   currency0 (${isAED0 ? 'AED' : 'INR'}): ${poolKey.currency0}`);
    console.log(`   currency1 (${isAED0 ? 'INR' : 'AED'}): ${poolKey.currency1}`);
    console.log(`   fee: ${poolKey.fee} (0.3%)`);
    console.log(`   tickSpacing: ${poolKey.tickSpacing}\n`);

    // Approve tokens to PoolModifyLiquidityTest contract
    console.log(`🔓 Approving tokens...`);
    
    const checkApprove = async (contract, spender, name) => {
        const allowance = await contract.allowance(wallet.address, spender);
        if (allowance < ethers.parseUnits("1000", 6)) {
            console.log(`   Approving ${name}...`);
            const tx = await contract.approve(spender, ethers.MaxUint256);
            await tx.wait();
            console.log(`   ✅ ${name} approved`);
        } else {
            console.log(`   ✅ ${name} already approved`);
        }
    };

    await checkApprove(aed, POOL_MODIFY_LIQUIDITY_TEST, "AED");
    await checkApprove(inr, POOL_MODIFY_LIQUIDITY_TEST, "INR");

    // Connect to PoolModifyLiquidityTest
    const poolModifyTest = new ethers.Contract(POOL_MODIFY_LIQUIDITY_TEST, POOL_MODIFY_TEST_ABI, wallet);

    // Calculate liquidity - small amount for testing
    const amount0 = ethers.parseUnits("10", aedDec); // 10 AED
    const Q96 = 2n ** 96n;
    const liquidityDelta = (amount0 * BigInt(SQRT_PRICE_X96)) / Q96;

    console.log(`\n🌊 Initializing + Adding Liquidity:`);
    console.log(`   Amount: 10 AED`);
    console.log(`   Liquidity Delta: ${liquidityDelta.toString()}`);
    console.log(`   Price: 1 AED = 22.727 INR\n`);

    try {
        // This will initialize the pool if needed, then add liquidity
        console.log(`📡 Calling modifyLiquidity (initializes if needed)...`);
        
        const tx = await poolModifyTest.modifyLiquidity(
            poolKey,
            {
                tickLower: -600,  // Narrow range for testing
                tickUpper: 600,
                liquidityDelta: liquidityDelta,
                salt: ethers.ZeroHash
            },
            "0x",
            { gasLimit: 1000000 }
        );

        console.log(`✅ Transaction sent!`);
        console.log(`   Hash: ${tx.hash}`);
        console.log(`   BaseScan: https://sepolia.basescan.org/tx/${tx.hash}\n`);
        
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();

        console.log(`\n🎉 \x1b[32mSUCCESS!\x1b[0m`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`\n✅ Pool initialized and liquidity added!`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Add more liquidity using your V4LiquidityManager`);
        console.log(`   2. Test swaps on your frontend`);
        console.log(`   3. Pool is now live! 🚀\n`);

    } catch (error) {
        console.log(`\n❌ \x1b[31mFAILED\x1b[0m`);
        
        if (error.code === 'CALL_EXCEPTION') {
            console.log(`   Error: ${error.reason || 'execution reverted'}`);
            if (error.data) {
                console.log(`   Data: ${error.data}`);
            }
        } else {
            console.log(`   ${error.message}`);
        }
        
        process.exit(1);
    }
}

main().catch(console.error);
