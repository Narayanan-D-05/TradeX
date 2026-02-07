const { ethers } = require("hardhat");

// Base Sepolia addresses from deployment.json
const CUSTOM_MANAGER = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";
const HOOKS = "0x0000000000000000000000000000000000000000";

async function main() {
    console.log("🦄 Adding Liquidity via Custom V4LiquidityManager");
    const [deployer] = await ethers.getSigners();
    console.log("Signer:", deployer.address);

    const aedToken = await ethers.getContractAt("MockERC20", AED_TOKEN);
    const inrToken = await ethers.getContractAt("MockERC20", INR_TOKEN);

    // Pool parameters
    const poolKey = {
        currency0: AED_TOKEN,
        currency1: INR_TOKEN, // Sorted: 0xd1... < 0xed...
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOKS
    };

    // Amounts
    const aedAmount = ethers.parseUnits("10", 6); // 10 AED
    const inrAmount = ethers.parseUnits("227", 6); // 227 INR
    const liquidity = 100000n; // Simple liquidity amount

    const tickLower = -600;
    const tickUpper = 600;

    console.log("Approving Custom Manager...");
    await (await aedToken.approve(CUSTOM_MANAGER, ethers.MaxUint256)).wait();
    await (await inrToken.approve(CUSTOM_MANAGER, ethers.MaxUint256)).wait();
    console.log("✅ Tokens approved");

    const manager = await ethers.getContractAt("V4LiquidityManager", CUSTOM_MANAGER);

    console.log("Calling addLiquidity...");

    // Try static call first
    try {
        await manager.addLiquidity.staticCall(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            aedAmount,
            inrAmount
        );
        console.log("✅ Simulation passed");
    } catch (e) {
        console.error("❌ Simulation failed:", e.message);
        if (e.data) console.error("Error data:", e.data);
        throw e;
    }

    const tx = await manager.addLiquidity(
        poolKey,
        tickLower,
        tickUpper,
        liquidity,
        aedAmount,
        inrAmount,
        { gasLimit: 500000 }
    );

    console.log("Tx submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Liquidity Added! Gas used:", receipt.gasUsed.toString());
    console.log(`Explore: https://sepolia.basescan.org/tx/${tx.hash}`);

}

main().catch(console.error);
