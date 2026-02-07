const hre = require("hardhat");
const ethers = hre.ethers;

// Deployed addresses
const AED_STABLE = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_STABLE = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";
const POOL_MANAGER = ethers.getAddress("0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("💧 Deploying Liquidity Manager & Adding Liquidity\n");
    console.log("Deployer:", deployer.address);

    const aed = ethers.getAddress(AED_STABLE);
    const inr = ethers.getAddress(INR_STABLE);

    // Deploy V4LiquidityManager
    console.log("\n1️⃣ Deploying V4LiquidityManager...");
    const V4LiquidityManager = await ethers.getContractFactory("V4LiquidityManager");
    const manager = await V4LiquidityManager.deploy(POOL_MANAGER);
    await manager.waitForDeployment();
    const managerAddress = await manager.getAddress();
    
    console.log("✅ V4LiquidityManager deployed:", managerAddress);

    // Pool configuration
    const poolKey = {
        currency0: aed,
        currency1: inr,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Full range liquidity
    const tickLower = -887220;
    const tickUpper = 887220;

    // Amounts
    const amount0Max = ethers.parseUnits("100000", 6); // 100,000 AED
    const amount1Max = ethers.parseUnits("2270000", 6); // 2,270,000 INR
    
    // Calculate liquidity delta (simplified: use smaller amount as basis)
    const liquidityDelta = ethers.parseUnits("1000000", 18);

    console.log("\n📊 Liquidity Parameters:");
    console.log("Amount0 Max:", ethers.formatUnits(amount0Max, 6), "AED");
    console.log("Amount1 Max:", ethers.formatUnits(amount1Max, 6), "INR");
    console.log("Liquidity:", ethers.formatUnits(liquidityDelta, 18));
    console.log("Tick Range:", tickLower, "to", tickUpper);

    // Get token contracts
    const ERC20_ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)"
    ];
    const token0 = new ethers.Contract(poolKey.currency0, ERC20_ABI, deployer);
    const token1 = new ethers.Contract(poolKey.currency1, ERC20_ABI, deployer);

    // Check balances
    const balance0 = await token0.balanceOf(deployer.address);
    const balance1 = await token1.balanceOf(deployer.address);
    console.log("\n💰 Token Balances:");
    console.log("AED:", ethers.formatUnits(balance0, 6));
    console.log("INR:", ethers.formatUnits(balance1, 6));

    // Approve manager to spend tokens
    console.log("\n2️⃣ Approving tokens for manager...");
    
    // Add delays to avoid nonce issues
    let tx = await token0.approve(managerAddress, amount0Max);
    await tx.wait();
    console.log("  ✅ AED approved");

    // Wait a bit before next transaction
    await new Promise(resolve => setTimeout(resolve, 2000));

    tx = await token1.approve(managerAddress, amount1Max);
    await tx.wait();
    console.log("  ✅ INR approved");

    // Wait before adding liquidity
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add liquidity
    console.log("\n3️⃣ Adding liquidity...");
    try {
        tx = await manager.addLiquidity(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            tickLower,
            tickUpper,
            liquidityDelta,
            amount0Max,
            amount1Max,
            { gasLimit: 2000000 }
        );

        console.log("  TX submitted:", tx.hash);
        const receipt = await tx.wait();
        
        console.log("✅ Liquidity added!");
        console.log("  Gas used:", receipt.gasUsed.toString());
        console.log("  Events:", receipt.logs.length);

        // Check for LiquidityAdded event
        const liquidityEvent = receipt.logs.find(log => {
            try {
                return log.topics[0] === ethers.id("LiquidityAdded(address,int256,int256)");
            } catch {
                return false;
            }
        });

        if (liquidityEvent) {
            console.log("  ✅ LiquidityAdded event found!");
        }

        console.log("\n🔍 View on BaseScan:");
        console.log(`https://sepolia.basescan.org/tx/${tx.hash}`);

        // Check final balances
        const finalBalance0 = await token0.balanceOf(deployer.address);
        const finalBalance1 = await token1.balanceOf(deployer.address);
        console.log("\n💰 Final Balances:");
        console.log("AED:", ethers.formatUnits(finalBalance0, 6));
        console.log("INR:", ethers.formatUnits(finalBalance1, 6));
        console.log("\n📊 Spent:");
        console.log("AED:", ethers.formatUnits(balance0 - finalBalance0, 6));
        console.log("INR:", ethers.formatUnits(balance1 - finalBalance1, 6));

        console.log("\n✅ INTEGRATION COMPLETE!");
        console.log("═══════════════════════════════════════════════");
        console.log("Pool initialized & liquidity added on Base Sepolia");
        console.log("Pool Manager:", POOL_MANAGER);
        console.log("Liquidity Manager:", managerAddress);
        console.log("═══════════════════════════════════════════════");

    } catch (error) {
        console.log("❌ Error:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
