const { ethers } = require("hardhat");

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const Actions = {
    MINT_POSITION: 0,
    SETTLE_PAIR: 4,
};

function calculateSqrtPriceX96(price) {
    // For 1 AED = 22.727 INR
    // Since AED is token0, sqrtPrice = sqrt(P) where P = reserves1 / reserves0
    // Manual calculation to avoid overflow
    // sqrt(22.727) ≈ 4.767
    // Q96 = 2^96
    // Result = 4.767 * 2^96/1 = 377703178620637355086515798016n
    const sqrtPrice = 4.767; // sqrt(22.727)
    const Q96 = 2n ** 96n;
    const multiplier = 1000000n; // for precision
    const sqrtPriceBig = BigInt(Math.floor(sqrtPrice * 1000000));
    return (sqrtPriceBig * Q96) / multiplier;
}

function calculateLiquidity(amount0, amount1) {
    const product = amount0 * amount1;
    return ethers.toBigInt(Math.floor(Math.sqrt(Number(product))));
}

async function main() {
    console.log("🦄 Initialize Pool + Add Liquidity\n");

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
    console.log("Price: 1 AED = 22.727 INR\n");

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

    // Connect to contracts
    const token0 = await ethers.getContractAt("IERC20", currency0);
    const token1 = await ethers.getContractAt("IERC20", currency1);
    const poolManager = await ethers.getContractAt(
        ["function initialize((address,address,uint24,int24,address),uint160) external returns (int24)",
         "function unlock(bytes) external returns (bytes)",
         "function getSlot0(bytes32) external view returns (uint160,int24)"],
        POOL_MANAGER
    );
    const positionManager = await ethers.getContractAt(
        ["function modifyLiquidities(bytes,uint256) external payable",
         "function initializePool((address,address,uint24,int24,address),uint160) external returns (int24)"],
        POSITION_MANAGER
    );
    const permit2 = await ethers.getContractAt(
        ["function allowance(address,address,address) external view returns (uint160,uint48,uint48)",
         "function approve(address,address,uint160,uint48) external"],
        PERMIT2
    );

    // Check if pool exists
    let poolExists = false;
    try {
        const [sqrtPrice] = await poolManager.getSlot0(poolId);
        poolExists = sqrtPrice > 0n;
        console.log("Pool exists:", poolExists);
        if (poolExists) {
            console.log("sqrtPriceX96:", sqrtPrice.toString());
        }
    } catch (e) {
        console.log("Pool does not exist yet");
    }

    // Initialize pool if needed
    if (!poolExists) {
        console.log("\n1️⃣ Initializing Pool...");
        const price = 22.727; // 1 AED = 22.727 INR
        const sqrtPriceX96 = calculateSqrtPriceX96(price);
        console.log("sqrtPriceX96:", sqrtPriceX96.toString());

        try {
            const tx = await positionManager.initializePool(
                [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
                sqrtPriceX96
            );
            console.log("TX submitted:", tx.hash);
            await tx.wait();
            console.log("✅ Pool initialized!");
            
            // Verify pool is actually initialized
            console.log("Verifying pool initialization...");
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s for state  
            try {
                const [sqrtPrice] = await poolManager.getSlot0(poolId);
                console.log("Pool sqrtPrice after init:", sqrtPrice.toString());
                if (sqrtPrice == 0n) {
                    console.log("❌ WARNING: Pool shows as not initialized after init tx!");
                } else {
                    console.log("✅ Pool verified as initialized");
                }
            } catch (e) {
                console.log("❌ WARNING: Cannot query pool after init:", e.message);
            }
        } catch (error) {
            console.log("❌ Initialization failed:", error.message);
            if (error.data) console.log("Error data:", error.data);
            process.exit(1);
        }
    }

    // Check token balances
    const balance0 = await token0.balanceOf(deployer.address);
    const balance1 = await token1.balanceOf(deployer.address);
    console.log("\n2️⃣ Token Balances:");
    console.log(`  AED: ${ethers.formatUnits(balance0, 6)}`);
    console.log(`  INR: ${ethers.formatUnits(balance1, 6)}`);

    // Approve tokens to Permit2
    console.log("\n3️⃣ Approving Tokens to Permit2...");
    const allowance0 = await token0.allowance(deployer.address, PERMIT2);
    if (allowance0 < balance0) {
        const tx = await token0.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("✅ Token0 approved");
    } else {
        console.log("✅ Token0 already approved");
    }

    const allowance1 = await token1.allowance(deployer.address, PERMIT2);
    if (allowance1 < balance1) {
        const tx = await token1.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("✅ Token1 approved");
    } else {
        console.log("✅ Token1 already approved");
    }

    // Approve PositionManager on Permit2
    console.log("\n4️⃣ Setting Permit2 Allowances for PositionManager...");
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    const maxAllowance = ethers.toBigInt("0xffffffffffffffffffffffffffffffff");

    const [amt0] = await permit2.allowance(deployer.address, currency0, POSITION_MANAGER);
    if (amt0 < ethers.parseUnits("10000", 6)) {
        const tx0 = await permit2.approve(currency0, POSITION_MANAGER, maxAllowance, deadline);
        await tx0.wait();
        console.log("✅ Token0 Permit2 allowance set");
    } else {
        console.log("✅ Token0 Permit2 allowance already set");
    }

    const [amt1] = await permit2.allowance(deployer.address, currency1, POSITION_MANAGER);
    if (amt1 < ethers.parseUnits("100000", 6)) {
        const tx1 = await permit2.approve(currency1, POSITION_MANAGER, maxAllowance, deadline);
        await tx1.wait();
        console.log("✅ Token1 Permit2 allowance set");
    } else {
        console.log("✅ Token1 Permit2 allowance already set");
    }

    // Add liquidity
    console.log("\n5️⃣ Adding Liquidity...");
    const amount0ToAdd = balance0 / 10n;
    const amount1ToAdd = balance1 / 10n;
    console.log(`  Amount0: ${ethers.formatUnits(amount0ToAdd, 6)} AED`);
    console.log(`  Amount1: ${ethers.formatUnits(amount1ToAdd, 6)} INR`);

    const liquidity = calculateLiquidity(amount0ToAdd, amount1ToAdd);
    console.log(`  Liquidity: ${liquidity.toString()}`);

    const tickLower = -887220;
    const tickUpper = 887220;

    // Debug poolKey values
    console.log("\n  Debug - PoolKey values:");
    console.log("  currency0:", poolKey.currency0);
    console.log("  currency1:", poolKey.currency1);
    console.log("  fee:", poolKey.fee);
    console.log("  tickSpacing:", poolKey.tickSpacing);
    console.log("  hooks:", poolKey.hooks);

    // Encode parameters - use array form for poolKey
    const maxUint128 = (2n ** 128n) - 1n;
    const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
        [
            [poolKey.currency0, poolKey.currency1, Number(poolKey.fee), Number(poolKey.tickSpacing), poolKey.hooks],
            tickLower,
            tickUpper,
            liquidity,
            maxUint128,
            maxUint128,
            deployer.address,
            "0x"
        ]
    );

    const settlePairParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [currency0, currency1]
    );

    const actions = ethers.solidityPacked(
        ["uint8", "uint8"],
        [Actions.MINT_POSITION, Actions.SETTLE_PAIR]
    );

    const unlockData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes[]"],
        [actions, [mintParams, settlePairParams]]
    );

    console.log("  Encoded parameters successfully");

    try {
        const tx = await positionManager.modifyLiquidities(
            unlockData,
            Math.floor(Date.now() / 1000) + 3600
        );
        console.log("  TX submitted:", tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("  ✅ Liquidity added successfully!");
            console.log("  Gas used:", receipt.gasUsed.toString());
        } else {
            console.log("  ❌ Transaction failed");
        }
    } catch (error) {
        console.log("  ❌ Error:", error.message);
        if (error.data) console.log("  Data:", error.data);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
