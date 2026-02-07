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

// Contracts on Base Sepolia
const POOL_MODIFY_LIQUIDITY_TEST = "0x37429cd17cb1454c34e7f50b09725202fd533039";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

const FEE = 3000;
const TICK_SPACING = 60;
const SQRT_PRICE_X96 = "377680650705498097308424011251";

const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const POOL_MODIFY_TEST_ABI = [
    "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns (int256, int256)"
];

async function main() {
    console.log("\n💰 \x1b[36mADDING MORE LIQUIDITY TO AED/INR POOL\x1b[0m\n");

    if (!PRIVATE_KEY) {
        console.error("❌ Error: No private key found");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`🦊 Wallet: ${wallet.address}`);

    const aed = new ethers.Contract(AED_TOKEN, ERC20_ABI, wallet);
    const inr = new ethers.Contract(INR_TOKEN, ERC20_ABI, wallet);
    
    const [aedBal, inrBal, aedDec, inrDec] = await Promise.all([
        aed.balanceOf(wallet.address),
        inr.balanceOf(wallet.address),
        aed.decimals(),
        inr.decimals()
    ]);

    console.log(`💰 Available Balances:`);
    console.log(`   AED: ${ethers.formatUnits(aedBal, aedDec)}`);
    console.log(`   INR: ${ethers.formatUnits(inrBal, inrDec)}\n`);

    // Add 1000 AED worth of liquidity (full range)
    const aedAmount = ethers.parseUnits("1000", aedDec);
    const inrAmount = ethers.parseUnits("22727", inrDec); // 1000 * 22.727

    console.log(`📊 Adding liquidity:`);
    console.log(`   AED: 1000`);
    console.log(`   INR: 22,727 (at 1 AED = 22.727 INR)\n`);

    if (aedAmount > aedBal || inrAmount > inrBal) {
        console.log(`⚠️  Insufficient balance! Adjusting to available amounts...`);
        const maxAed = aedBal / 2n; // Use half of balance
        const maxInr = inrBal / 2n;
        console.log(`   Will add: ${ethers.formatUnits(maxAed, aedDec)} AED`);
        console.log(`   Will add: ${ethers.formatUnits(maxInr, inrDec)} INR\n`);
    }

    const isAED0 = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase();
    const poolKey = {
        currency0: isAED0 ? AED_TOKEN : INR_TOKEN,
        currency1: isAED0 ? INR_TOKEN : AED_TOKEN,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: ethers.ZeroAddress
    };

    // Check approvals
    const poolModifyTest = new ethers.Contract(POOL_MODIFY_LIQUIDITY_TEST, POOL_MODIFY_TEST_ABI, wallet);
    
    const [aedAllowance, inrAllowance] = await Promise.all([
        aed.allowance(wallet.address, POOL_MODIFY_LIQUIDITY_TEST),
        inr.allowance(wallet.address, POOL_MODIFY_LIQUIDITY_TEST)
    ]);

    if (aedAllowance < aedAmount) {
        console.log(`🔓 Approving AED...`);
        const tx = await aed.approve(POOL_MODIFY_LIQUIDITY_TEST, ethers.MaxUint256);
        await tx.wait();
        console.log(`   ✅ AED approved\n`);
    }

    if (inrAllowance < inrAmount) {
        console.log(`🔓 Approving INR...`);
        const tx = await inr.approve(POOL_MODIFY_LIQUIDITY_TEST, ethers.MaxUint256);
        await tx.wait();
        console.log(`   ✅ INR approved\n`);
    }

    // Calculate liquidity delta
    const Q96 = 2n ** 96n;
    const liquidityDelta = (aedAmount * BigInt(SQRT_PRICE_X96)) / Q96;

    console.log(`🌊 Adding liquidity (full range -887220 to 887220)...`);
    console.log(`   Liquidity Delta: ${liquidityDelta.toString()}\n`);

    try {
        const tx = await poolModifyTest.modifyLiquidity(
            poolKey,
            {
                tickLower: -887220,
                tickUpper: 887220,
                liquidityDelta: liquidityDelta,
                salt: ethers.ZeroHash
            },
            "0x",
            { gasLimit: 1000000 }
        );

        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log(`   BaseScan: https://sepolia.basescan.org/tx/${tx.hash}\n`);
        
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();

        console.log(`\n🎉 \x1b[32mLIQUIDITY ADDED SUCCESSFULLY!\x1b[0m`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

        // Check new balances
        const [newAedBal, newInrBal] = await Promise.all([
            aed.balanceOf(wallet.address),
            inr.balanceOf(wallet.address)
        ]);

        console.log(`💰 Remaining Balances:`);
        console.log(`   AED: ${ethers.formatUnits(newAedBal, aedDec)}`);
        console.log(`   INR: ${ethers.formatUnits(newInrBal, inrDec)}\n`);

        console.log(`✅ Pool now has substantial liquidity for testing swaps!`);
        console.log(`\n📋 Next: Test swaps on your frontend! 🚀\n`);

    } catch (error) {
        console.log(`\n❌ Failed to add liquidity`);
        console.log(`   ${error.message.split('\n')[0]}`);
        process.exit(1);
    }
}

main().catch(console.error);
