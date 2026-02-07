const hre = require("hardhat");
const { ethers } = require("hardhat");

// Uniswap V4 Sepolia addresses
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Action constants (from PositionManager)
const Actions = {
    MINT_POSITION: 0,
    SETTLE_PAIR: 4,
    CLOSE_CURRENCY: 2,
    SETTLE: 3,
    TAKE: 1
};

function calculateSqrtPriceX96(price) {
    const Q96 = ethers.toBigInt(2) ** ethers.toBigInt(96);
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceQ96 = ethers.toBigInt(Math.floor(sqrtPrice * Number(Q96)));
    return sqrtPriceQ96;
}

// Simpler liquidity calculation for full range
function calculateLiquidity(amount0, amount1) {
    // For a 1:1 price pool, liquidity ≈ sqrt(amount0 * amount1)
    const product = amount0 * amount1;
    return ethers.toBigInt(Math.floor(Math.sqrt(Number(product))));
}

async function main() {
    console.log("🦄 Uniswap V4: Add Liquidity to Pool (FIXED)\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Load token addresses from deployment
    const deployment = require("../deployments/sepolia-deployment.json");
    const AED_STABLE = deployment.contracts.AED_STABLE;
    const INR_STABLE = deployment.contracts.INR_STABLE;

    console.log("AED:", AED_STABLE);
    console.log("INR:", INR_STABLE);

    // Sort tokens (currency0 < currency1)
    const [currency0, currency1] = BigInt(AED_STABLE) < BigInt(INR_STABLE)
        ? [AED_STABLE, INR_STABLE]
        : [INR_STABLE, AED_STABLE];

    console.log("\n📊 Pool Configuration:");
    console.log(`  currency0: ${currency0} (${currency0 === AED_STABLE ? 'AED' : 'INR'})`);
    console.log(`  currency1: ${currency1} (${currency1 === AED_STABLE ? 'AED' : 'INR'})`);
    console.log("  fee: 3000 (0.3%)");
    console.log("  tickSpacing: 60");
    console.log("  hooks: 0x0000000000000000000000000000000000000000");

    // Connect to contracts
    const token0 = await ethers.getContractAt("IERC20", currency0);
    const token1 = await ethers.getContractAt("IERC20", currency1);
    const poolManager = await ethers.getContractAt(
        ["function initialize((address,address,uint24,int24,address),uint160) external returns (int24)"],
        POOL_MANAGER
    );
    const positionManager = await ethers.getContractAt(
        ["function modifyLiquidities(bytes calldata,uint256) external payable",
         "function nextTokenId() external view returns (uint256)",
         "function getPositionLiquidity(uint256) external view returns (uint128)"],
        POSITION_MANAGER
    );
    const permit2 = await ethers.getContractAt(
        ["function allowance(address,address,address) external view returns (uint160,uint48,uint48)",
         "function approve(address,address,uint160,uint48) external"],
        PERMIT2
    );

    // 1️⃣ Check token balances
    console.log("\n1️⃣ Token Balances:");
    const balance0 = await token0.balanceOf(deployer.address);
    const balance1 = await token1.balanceOf(deployer.address);
    console.log(`  ${currency0 === AED_STABLE ? 'AEDs' : 'INRs'}: ${ethers.formatUnits(balance0, 6)}`);
    console.log(`  ${currency1 === AED_STABLE ? 'AEDs' : 'INRs'}: ${ethers.formatUnits(balance1, 6)}`);

    // Pool parameters
    const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // 2️⃣ Check if pool exists
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );
    console.log("\n2️⃣ Pool ID:", poolId);

    const getSlot0Contract = await ethers.getContractAt(
        ["function getSlot0(bytes32) external view returns (uint160 sqrtPriceX96, int24 tick)"],
        POOL_MANAGER
    );
    try {
        const slot0 = await getSlot0Contract.getSlot0(poolId);
        const sqrtPriceX96 = slot0[0];
        
        if (sqrtPriceX96 == 0n) {
            console.log("❌ Pool not initialized! Run initialization first.");
            process.exit(1);
        }
        console.log("✅ Pool exists! sqrtPriceX96:", sqrtPriceX96.toString());
    } catch (error) {
        console.log("❌ Error checking pool:", error.message);
        console.log("Pool may not be initialized yet.");
        process.exit(1);
    }

    // 3️⃣ Approve tokens to Permit2 (if not already)
    console.log("\n3️⃣ Token Approvals to Permit2:");
    const allowance0 = await token0.allowance(deployer.address, PERMIT2);
    const allowance1 = await token1.allowance(deployer.address, PERMIT2);

    if (allowance0 < ethers.parseUnits("1000000", 6)) {
        console.log("  Approving token0 to Permit2...");
        const tx = await token0.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("  ✅ Token0 approved");
    } else {
        console.log("  ✅ Token0 already approved");
    }

    if (allowance1 < ethers.parseUnits("1000000", 6)) {
        console.log("  Approving token1 to Permit2...");
        const tx = await token1.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("  ✅ Token1 approved");
    } else {
        console.log("  ✅ Token1 already approved");
    }

    // 4️⃣ Approve PositionManager on Permit2
    console.log("\n4️⃣ Permit2 Allowances to PositionManager:");
    
    // Check current allowances
    const [amt0, exp0, nonce0] = await permit2.allowance(deployer.address, currency0, POSITION_MANAGER);
    const [amt1, exp1, nonce1] = await permit2.allowance(deployer.address, currency1, POSITION_MANAGER);
    
    console.log(`  Current allowance0: ${amt0.toString()}`);
    console.log(`  Current allowance1: ${amt1.toString()}`);

    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const maxAllowance = ethers.toBigInt("0xffffffffffffffffffffffffffffffff"); // max uint160

    if (amt0 < ethers.parseUnits("100000", 6)) {
        console.log("  Setting Permit2 allowance for token0...");
        try {
            const tx0 = await permit2.approve(currency0, POSITION_MANAGER, maxAllowance, deadline);
            const receipt0 = await tx0.wait();
            console.log("  ✅ Token0 allowance set, tx:", receipt0.hash);
        } catch (error) {
            console.log("  ⚠️ Token0 approve failed:", error.message);
        }
    } else {
        console.log("  ✅ Token0 allowance already set");
    }

    if (amt1 < ethers.parseUnits("100000", 6)) {
        console.log("  Setting Permit2 allowance for token1...");
        try {
            const tx1 = await permit2.approve(currency1, POSITION_MANAGER, maxAllowance, deadline);
            const receipt1 = await tx1.wait();
            console.log("  ✅ Token1 allowance set, tx:", receipt1.hash);
        } catch (error) {
            console.log("  ⚠️ Token1 approve failed:", error.message);
        }
    } else {
        console.log("  ✅ Token1 allowance already set");
    }

    // Wait a bit for state to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5️⃣ Add liquidity using proper action encoding
    console.log("\n5️⃣ Adding Liquidity to Pool:");
    
    // Calculate amounts (10% of balance for safety)
    const amount0ToAdd = balance0 / 10n;
    const amount1ToAdd = balance1 / 10n;
    console.log(`  Amount0: ${ethers.formatUnits(amount0ToAdd, 6)}`);
    console.log(`  Amount1: ${ethers.formatUnits(amount1ToAdd, 6)}`);

    // Calculate liquidity
    const liquidity = calculateLiquidity(amount0ToAdd, amount1ToAdd);
    console.log(`  Liquidity: ${liquidity.toString()}`);

    // Full range ticks
    const tickLower = -887220;
    const tickUpper = 887220;

    // Encode MINT_POSITION parameters
    const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
         "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
        [
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            ethers.MaxUint128, // amount0Max (no slippage check)
            ethers.MaxUint128, // amount1Max (no slippage check)
            deployer.address, // recipient
            "0x" // hookData
        ]
    );

    // Encode SETTLE_PAIR parameters
    const settlePairParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [currency0, currency1]
    );

    // Encode actions array
    const actions = ethers.solidityPacked(
        ["uint8", "uint8"],
        [Actions.MINT_POSITION, Actions.SETTLE_PAIR]
    );

    // Combine into unlockData
    const unlockData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes[]"],
        [actions, [mintParams, settlePairParams]]
    );

    console.log("  Encoded unlockData length:", unlockData.length);
    console.log("  Calling modifyLiquidities...");

    try {
        // Estimate gas first to catch errors
        const gasEstimate = await positionManager.modifyLiquidities.estimateGas(
            unlockData,
            Math.floor(Date.now() / 1000) + 3600
        );
        console.log("  Gas estimate:", gasEstimate.toString());

        // Execute transaction
        const tx = await positionManager.modifyLiquidities(
            unlockData,
            Math.floor(Date.now() / 1000) + 3600,
            { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
        );

        console.log("  Transaction submitted:", tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("  ✅ Liquidity added successfully!");
            console.log("  Gas used:", receipt.gasUsed.toString());
            
            // Check final balances
            const finalBalance0 = await token0.balanceOf(deployer.address);
            const finalBalance1 = await token1.balanceOf(deployer.address);
            console.log("\n📊 Final Balances:");
            console.log(`  Token0: ${ethers.formatUnits(finalBalance0, 6)} (spent: ${ethers.formatUnits(balance0 - finalBalance0, 6)})`);
            console.log(`  Token1: ${ethers.formatUnits(finalBalance1, 6)} (spent: ${ethers.formatUnits(balance1 - finalBalance1, 6)})`);
        } else {
            console.log("  ❌ Transaction failed!");
        }
    } catch (error) {
        console.log("  ❌ Error adding liquidity:");
        console.log("  Message:", error.message);
        if (error.data) {
            console.log("  Data:", error.data);
        }
        if (error.transaction) {
            console.log("  Transaction:", error.transaction);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
