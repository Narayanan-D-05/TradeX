const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
} else {
    require("dotenv").config();
}

const PRIVATE_KEY = process.env.MAIN_WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const RPC_URL = "https://sepolia.base.org";

// ⚠️ CRITICAL: Testing with BOTH PoolManager addresses to find the correct one
const POOL_MANAGERS = {
    "original": "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408",  // From your previous attempts
    "alternative": "0x1b832D5395A41446b508632466cf32c6C07D63c7"  // From the multi-chain script
};

const V4_LIQUIDITY_MANAGER = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd"; // Your custom router
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

// Pool parameters
const FEE = 3000; // 0.3%
const TICK_SPACING = 60;
const SQRT_PRICE_X96 = "377680650705498097308424011251"; // 1 AED = 22.727 INR

const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

const POOL_MANAGER_ABI = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)",
    "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
];

const ROUTER_ABI = [
    "function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, int24 tickLower, int24 tickUpper, int256 liquidityDelta, uint256 amount0Max, uint256 amount1Max) external returns (uint128)",
    "function getPoolStatus((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (uint160 sqrtPriceX96, uint128 liquidity)"
];

async function main() {
    console.log("\n💎 \x1b[36mBASE SEPOLIA AED/INR POOL INITIALIZATION & LIQUIDITY\x1b[0m 💎");
    console.log(`Target: 1 AED = 22.727 INR | Fee: ${FEE} (0.3%) | TS: ${TICK_SPACING}\n`);

    if (!PRIVATE_KEY) {
        console.error("❌ Error: PRIVATE_KEY or MAIN_WALLET_PRIVATE_KEY is missing.");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`🦊 Wallet: ${wallet.address}\n`);

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

    console.log(`💰 Balances:`);
    console.log(`   AED: ${ethers.formatUnits(aedBal, aedDec)}`);
    console.log(`   INR: ${ethers.formatUnits(inrBal, inrDec)}\n`);

    // Determine currency order (currency0 < currency1)
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
    console.log(`   fee: ${poolKey.fee}`);
    console.log(`   tickSpacing: ${poolKey.tickSpacing}\n`);

    // Calculate Pool ID
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log(`🆔 Pool ID: ${poolId}\n`);

    // ========================
    // STEP 1: Test Both PoolManagers
    // ========================
    let workingPoolManager = null;
    let workingManagerContract = null;

    for (const [name, address] of Object.entries(POOL_MANAGERS)) {
        console.log(`\n🔍 Testing PoolManager (${name}): ${address}`);
        const manager = new ethers.Contract(address, POOL_MANAGER_ABI, wallet);

        // Try to query pool state
        try {
            const slot0 = await manager.getSlot0(poolId);
            console.log(`   ✅ Pool state query successful!`);
            console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
            
            if (slot0.sqrtPriceX96 === 0n) {
                console.log(`   ⚠️  Pool NOT initialized (sqrtPrice = 0)`);
                workingPoolManager = address;
                workingManagerContract = manager;
                console.log(`   → Will attempt initialization with this manager`);
            } else {
                console.log(`   ✅ Pool ALREADY INITIALIZED!`);
                workingPoolManager = address;
                workingManagerContract = manager;
                console.log(`   → Will use this manager for liquidity`);
                break; // Pool already initialized, use this one
            }
        } catch (e) {
            console.log(`   ❌ Failed to query pool: ${e.message.split('(')[0]}`);
        }
    }

    if (!workingPoolManager) {
        console.log(`\n❌ Neither PoolManager responds to queries. Cannot proceed.`);
        process.exit(1);
    }

    console.log(`\n✅ Using PoolManager: ${workingPoolManager}`);

    // ========================
    // STEP 2: Initialize Pool (if needed)
    // ========================
    try {
        const slot0 = await workingManagerContract.getSlot0(poolId);
        if (slot0.sqrtPriceX96 === 0n) {
            console.log(`\n🎯 Initializing pool...`);
            const tx = await workingManagerContract.initialize(
                poolKey,
                SQRT_PRICE_X96,
                "0x",
                { gasLimit: 1000000 }
            );
            console.log(`   ⏳ Tx: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`   ✅ Pool initialized! (Block: ${receipt.blockNumber})`);
        } else {
            console.log(`\n✅ Pool already initialized (sqrtPrice: ${slot0.sqrtPriceX96.toString()})`);
        }
    } catch (e) {
        console.log(`\n⚠️  Initialization status unclear: ${e.message.split('(')[0]}`);
        console.log(`   Proceeding with liquidity attempt anyway...`);
    }

    // ========================
    // STEP 3: Approve Tokens
    // ========================
    console.log(`\n🔓 Checking token approvals...`);
    
    const checkApprove = async (contract, spender, name) => {
        const allowance = await contract.allowance(wallet.address, spender);
        if (allowance < ethers.parseUnits("1000000", 6)) {
            console.log(`   Approving ${name} for ${spender}...`);
            const tx = await contract.approve(spender, ethers.MaxUint256);
            await tx.wait();
            console.log(`   ✅ ${name} approved`);
        } else {
            console.log(`   ✅ ${name} already approved`);
        }
    };

    // Approve to both PoolManager and LiquidityManager
    await checkApprove(aed, workingPoolManager, "AED → PoolManager");
    await checkApprove(inr, workingPoolManager, "INR → PoolManager");
    await checkApprove(aed, V4_LIQUIDITY_MANAGER, "AED → LiquidityManager");
    await checkApprove(inr, V4_LIQUIDITY_MANAGER, "INR → LiquidityManager");

    // ========================
    // STEP 4: Add Liquidity
    // ========================
    console.log(`\n🌊 Adding liquidity...`);
    
    const router = new ethers.Contract(V4_LIQUIDITY_MANAGER, ROUTER_ABI, wallet);

    // Use small amounts for initial test
    const amount0 = ethers.parseUnits("10", aedDec); // 10 AED
    const amount1 = ethers.parseUnits("227", inrDec); // 227 INR
    
    console.log(`   Amount0 (${isAED0 ? 'AED' : 'INR'}): ${ethers.formatUnits(amount0, 6)}`);
    console.log(`   Amount1 (${isAED0 ? 'INR' : 'AED'}): ${ethers.formatUnits(amount1, 6)}`);

    // Calculate liquidity delta
    const Q96 = 2n ** 96n;
    const liquidityDelta = (amount0 * BigInt(SQRT_PRICE_X96)) / Q96;
    console.log(`   Liquidity Delta: ${liquidityDelta.toString()}`);

    try {
        const tx = await router.addLiquidity(
            poolKey,
            -600, // tickLower
            600,  // tickUpper
            liquidityDelta,
            amount0,
            amount1,
            { gasLimit: 2000000 }
        );

        console.log(`   ⏳ Tx: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`\n✅ SUCCESS! Liquidity added to AED/INR pool on Base Sepolia!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    } catch (e) {
        console.log(`\n❌ Liquidity addition failed:`);
        console.log(`   ${e.message}`);
        
        // Try to get revert reason
        if (e.receipt) {
            console.log(`   Gas used: ${e.receipt.gasUsed.toString()}`);
        }
    }
}

main().catch(console.error);
