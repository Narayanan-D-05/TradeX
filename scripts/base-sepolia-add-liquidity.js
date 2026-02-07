const hre = require("hardhat");
const ethers = hre.ethers;

// Deployed addresses
const AED_STABLE = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_STABLE = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";
const POOL_MANAGER = ethers.getAddress("0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829");
const POOL_ID = "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("💧 Adding Liquidity to Uniswap V4 Pool on Base Sepolia\n");
    console.log("Deployer:", deployer.address);

    const aed = ethers.getAddress(AED_STABLE);
    const inr = ethers.getAddress(INR_STABLE);

    // Pool configuration
    const poolKey = {
        currency0: aed,
        currency1: inr,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Full range liquidity (-887220 to 887220)
    const tickLower = -887220;
    const tickUpper = 887220;

    // Amounts to add
    const amount0Desired = ethers.parseUnits("100000", 6); // 100,000 AED
    const amount1Desired = ethers.parseUnits("2270000", 6); // 2,270,000 INR

    console.log("\n📊 Liquidity Parameters:");
    console.log("Currency0 (AED):", poolKey.currency0);
    console.log("Currency1 (INR):", poolKey.currency1);
    console.log("Amount0:", ethers.formatUnits(amount0Desired, 6), "AED");
    console.log("Amount1:", ethers.formatUnits(amount1Desired, 6), "INR");
    console.log("Tick Range:", tickLower, "to", tickUpper);

    // Get token contracts
    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const token0 = new ethers.Contract(poolKey.currency0, ERC20_ABI, deployer);
    const token1 = new ethers.Contract(poolKey.currency1, ERC20_ABI, deployer);

    // Approve PoolManager to spend tokens
    console.log("\n1️⃣ Approving tokens...");
    
    let tx = await token0.approve(POOL_MANAGER, amount0Desired);
    await tx.wait();
    console.log("  ✅ AED approved");

    tx = await token1.approve(POOL_MANAGER, amount1Desired);
    await tx.wait();
    console.log("  ✅ INR approved");

    // For V4, we need to use PoolModifyLiquidityTest or similar helper
    // Check if it exists on Base Sepolia
    const MODIFY_POSITION_TEST = "0x83feDBeD11B3667f40263a88e8435fca51A03F8C"; // Common deployment address
    
    console.log("\n2️⃣ Checking for PoolModifyLiquidityTest...");
    const code = await ethers.provider.getCode(MODIFY_POSITION_TEST);
    
    if (code.length > 2) {
        console.log("  ✅ Found PoolModifyLiquidityTest at:", MODIFY_POSITION_TEST);
        
        // Use the test router
        const ROUTER_ABI = [
            "function modifyLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable"
        ];
        
        const router = new ethers.Contract(MODIFY_POSITION_TEST, ROUTER_ABI, deployer);
        
        // Approve router instead
        console.log("\n3️⃣ Approving router...");
        tx = await token0.approve(MODIFY_POSITION_TEST, amount0Desired);
        await tx.wait();
        tx = await token1.approve(MODIFY_POSITION_TEST, amount1Desired);
        await tx.wait();
        console.log("  ✅ Router approved");
        
        console.log("\n4️⃣ Adding liquidity...");
        
        // Estimate liquidity (simplified)
        const liquidity = ethers.parseUnits("1000000", 18);
        
        tx = await router.modifyLiquidity(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            [tickLower, tickUpper, liquidity, ethers.ZeroHash],
            "0x",
            { gasLimit: 1000000 }
        );
        
        console.log("  TX:", tx.hash);
        const receipt = await tx.wait();
        console.log("  ✅ Liquidity added!");
        console.log("  Gas used:", receipt.gasUsed.toString());
        
        console.log("\n🔍 View on BaseScan:");
        console.log(`https://sepolia.basescan.org/tx/${tx.hash}`);
    } else {
        console.log("  ❌ PoolModifyLiquidityTest not found");
        console.log("\n💡 Alternative: Deploy custom liquidity helper");
        console.log("   The Uniswap V4 test contracts may not be deployed on Base Sepolia");
        console.log("\n📚 Options:");
        console.log("   1. Deploy PoolModifyLiquidityTest from v4-core repo");
        console.log("   2. Use Uniswap V4 SDK to construct proper calls");
        console.log("   3. Deploy custom LiquidityHelper contract");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
