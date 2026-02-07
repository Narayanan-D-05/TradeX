const { ethers } = require("hardhat");

const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const Actions = {
    MINT_POSITION: 0,
    SETTLE_PAIR: 4
};

function calculateSqrtPriceX96(price) {
    const sqrtPrice = 4.767; // sqrt(22.727)
    const Q96 = 2n ** 96n;
    const multiplier = 1000000n;
    const sqrtPriceBig = BigInt(Math.floor(sqrtPrice * 1000000));
    return (sqrtPriceBig * Q96) / multiplier;
}

async function main() {
    console.log("🦄 Uniswap V4: Create Pool and Add Liquidity (Atomic)\n");

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

    const token0 = await ethers.getContractAt("IERC20", currency0);
    const token1 = await ethers.getContractAt("IERC20", currency1);
    const lpm = await ethers.getContractAt(
        ["function multicall(bytes[]) external payable returns (bytes[])",
         "function initializePool((address,address,uint24,int24,address),uint160) external returns (int24)",
         "function modifyLiquidities(bytes,uint256) external payable"],
        POSITION_MANAGER
    );
    const permit2 = await ethers.getContractAt(
        ["function allowance(address,address,address) external view returns (uint160,uint48,uint48)",
         "function approve(address,address,uint160,uint48) external"],
        PERMIT2
    );

    // Check and set approvals
    console.log("\n1️⃣ Setting up approvals...");
    const balance0 = await token0.balanceOf(deployer.address);
    const balance1 = await token1.balanceOf(deployer.address);
    console.log(`Balances: ${ethers.formatUnits(balance0, 6)} AED, ${ethers.formatUnits(balance1, 6)} INR`);

    // Approve tokens to Permit2
    const allowance0 = await token0.allowance(deployer.address, PERMIT2);
    if (allowance0 < balance0) {
        const tx = await token0.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("✅ Token0 approved to Permit2");
    }

    const allowance1 = await token1.allowance(deployer.address, PERMIT2);
    if (allowance1 < balance1) {
        const tx = await token1.approve(PERMIT2, ethers.MaxUint256);
        await tx.wait();
        console.log("✅ Token1 approved to Permit2");
    }

    // Approve PositionManager on Permit2
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    const maxAllowance = (2n ** 160n) - 1n;

    const [amt0] = await permit2.allowance(deployer.address, currency0, POSITION_MANAGER);
    if (amt0 < ethers.parseUnits("10000", 6)) {
        const tx = await permit2.approve(currency0, POSITION_MANAGER, maxAllowance, deadline);
        await tx.wait();
        console.log("✅ Permit2 allowance set for token0");
    }

    const [amt1] = await permit2.allowance(deployer.address, currency1, POSITION_MANAGER);
    if (amt1 < ethers.parseUnits("100000", 6)) {
        const tx = await permit2.approve(currency1, POSITION_MANAGER, maxAllowance, deadline);
        await tx.wait();
        console.log("✅ Permit2 allowance set for token1");
    }

    console.log("\n2️⃣ Creating pool and adding liquidity atomically...");

    // Calculate sqrtPriceX96
    const sqrtPriceX96 = calculateSqrtPriceX96(22.727);
    console.log("sqrtPriceX96:", sqrtPriceX96.toString());

    // Calculate liquidity (10% of balance)
    const amount0ToAdd = balance0 / 10n;
    const amount1ToAdd = balance1 / 10n;
    const liquidity = BigInt(Math.floor(Math.sqrt(Number(amount0ToAdd * amount1ToAdd))));
    console.log(`Adding liquidity: ${ethers.formatUnits(amount0ToAdd, 6)} AED, ${ethers.formatUnits(amount1ToAdd, 6)} INR`);
    console.log("Liquidity:", liquidity.toString());

    // Encode initializePool call
    const initializePoolCall = lpm.interface.encodeFunctionData("initializePool", [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        sqrtPriceX96
    ]);

    // Encode modifyLiquidities call
    const tickLower = -887220;
    const tickUpper = 887220;
    const maxUint128 = (2n ** 128n) - 1n;

    const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
        [
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
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

    const modifyLiquiditiesCall = lpm.interface.encodeFunctionData("modifyLiquidities", [
        unlockData,
        Math.floor(Date.now() / 1000) + 3600
    ]);

    // Execute multicall
    try {
        const tx = await lpm.multicall([initializePoolCall, modifyLiquiditiesCall]);
        console.log("TX submitted:", tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("\n✅ SUCCESS! Pool created and liquidity added!");
            console.log("Gas used:", receipt.gasUsed.toString());
            console.log("Transaction:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
        } else {
            console.log("❌ Transaction failed");
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
        if (error.data) console.log("Data:", error.data);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
