const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const ROUTER_ADDRESS = deployment.helpers.simpleV4Router;
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS = ethers.ZeroAddress;

async function main() {
    console.log("🦄 Adding Liquidity via SimpleV4Router (Legacy ABI)");
    console.log("Router:", ROUTER_ADDRESS);
    const [deployer] = await ethers.getSigners();
    console.log("Signer:", deployer.address);

    // Router Interface (matches SimpleV4Router.sol)
    const router = await ethers.getContractAt("SimpleV4Router", ROUTER_ADDRESS);
    const aedToken = await ethers.getContractAt("MockERC20", AED_TOKEN);
    const inrToken = await ethers.getContractAt("MockERC20", INR_TOKEN);

    // Pool parameters
    const [currency0, currency1] = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase()
        ? [AED_TOKEN, INR_TOKEN]
        : [INR_TOKEN, AED_TOKEN];

    const poolKey = {
        currency0,
        currency1,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: HOOKS
    };

    // Amounts
    const liquidity = 1000000n; // Micro liquidity

    // Full range (approx)
    const tickLower = -887220;
    const tickUpper = 887220;

    console.log("Checking allowances...");
    const aedAllowance = await aedToken.allowance(deployer.address, ROUTER_ADDRESS);
    if (aedAllowance < ethers.MaxUint256 / 2n) {
        console.log("Approving AED...");
        await (await aedToken.approve(ROUTER_ADDRESS, ethers.MaxUint256)).wait();
    }

    const inrAllowance = await inrToken.allowance(deployer.address, ROUTER_ADDRESS);
    if (inrAllowance < ethers.MaxUint256 / 2n) {
        console.log("Approving INR...");
        await (await inrToken.approve(ROUTER_ADDRESS, ethers.MaxUint256)).wait();
    }
    console.log("✅ Tokens approved");

    // Check initialization
    const pm = new ethers.Contract(POOL_MANAGER, [
        "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
    ], deployer);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    const poolId = ethers.keccak256(encoded);
    console.log("Pool ID:", poolId);

    try {
        await pm.getSlot0(poolId);
        console.log("✅ Pool already initialized");
    } catch (e) {
        console.log("⚠️ Pool NOT initialized. Initializing via Router...");
        // 1 AED = 22.73 INR
        const SQRT_PRICE_X96 = "377680650705498097308424011251";

        try {
            // Use router helper to initialize (legacy 2-arg)
            await router.initialize.staticCall(poolKey, SQRT_PRICE_X96);
            console.log("✅ Init Simulation passed");
            const tx = await router.initialize(poolKey, SQRT_PRICE_X96);
            await tx.wait();
            console.log("✅ Pool Initialized via Router");
        } catch (initErr) {
            console.log("❌ Init Failed:", initErr.message);
            if (initErr.data) console.log("Error data:", initErr.data);
            return;
        }
    }

    console.log("Calling addLiquidity...");

    // Flattened args for SimpleV4Router.addLiquidity
    // addLiquidity(key, tickLower, tickUpper, liquidityDelta, hookData)

    try {
        await router.addLiquidity.staticCall(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            "0x",
            { gasLimit: 5000000 }
        );
        console.log("✅ Simulation passed");
    } catch (e) {
        console.error("❌ Simulation failed:", e.message);
        if (e.data) {
            console.error("Error data:", e.data);
            const errors = {
                "0x486aa307": "PoolNotInitialized()",
                "0x7983c051": "PoolAlreadyInitialized()",
                "0x2083cd40": "InvalidPool()",
                "0x231f9057": "InvalidHooks()",
                "0x5212cba1": "Unknown_5212cba1"
            };
            const selector = e.data.slice(0, 10);
            if (errors[selector]) console.log("Decoded:", errors[selector]);
        }
        return;
    }

    const tx = await router.addLiquidity(
        poolKey,
        tickLower,
        tickUpper,
        liquidity,
        "0x",
        { gasLimit: 5000000 }
    );

    console.log("Tx submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Liquidity Added! Gas used:", receipt.gasUsed.toString());
    console.log(`Explore: https://sepolia.basescan.org/tx/${tx.hash}`);
}

main().catch(console.error);
