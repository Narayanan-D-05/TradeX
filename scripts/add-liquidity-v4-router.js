/**
 * Add V4 Liquidity using V4TestRouter pattern
 * Based on Uniswap V4 unlock callback pattern
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// Base Sepolia addresses
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const V4_LIQUIDITY_MANAGER = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd"; // Your deployed router
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

// Pool parameters
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = "0x0000000000000000000000000000000000000000";

// V4LiquidityManager ABI (actual deployed contract)
const V4_ROUTER_ABI = [
  "function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta, uint256 amount0Max, uint256 amount1Max) external returns (int256 delta0, int256 delta1)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  console.log("\n💧 Adding Liquidity via V4 Router (Correct Pattern)\n");

  const [deployer] = await ethers.getSigners();
  console.log("Signer address:", deployer.address);

  // Check balances
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, deployer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, deployer);

  const aedBalance = await aedToken.balanceOf(deployer.address);
  const inrBalance = await inrToken.balanceOf(deployer.address);
  
  console.log(`Token Balances:`);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)} AED`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)} INR`);

  if (aedBalance === 0n || inrBalance === 0n) {
    console.log("\n❌ ERROR: You need both AED and INR tokens");
    return;
  }

  // Liquidity parameters - START SMALL
  const aedAmount = ethers.parseUnits("10", 6); // 10 AED
  const inrAmount = ethers.parseUnits("227", 6); // 227 INR

  console.log(`\nAdding Liquidity:`);
  console.log(`AED: ${ethers.formatUnits(aedAmount, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrAmount, 6)}`);

  // Ticks for full range (must be divisible by tickSpacing=60)
  const tickLower = -887220;
  const tickUpper = 887220;

  // Calculate liquidityDelta based on amounts and tick range
  // For full range with small amounts: use a proportional value
  // liquidity ≈ sqrt(amount0 * amount1) but in proper V4 units
  const amount0Scaled = aedAmount * 1000000n; // Scale up
  const amount1Scaled = inrAmount * 1000n;    // Scale up proportionally
  const liquidityDelta = (amount0Scaled * amount1Scaled) / 1000000000n; // Scale down

  console.log(`\nTick Range: ${tickLower} to ${tickUpper} (Full Range)`);
  console.log(`Liquidity Delta: ${liquidityDelta.toString()}`);

  // Step 1: Approve tokens to V4LiquidityManager (it does transferFrom)
  console.log("\n1️⃣ Approving tokens to V4LiquidityManager...");
  
  const aedAllowance = await aedToken.allowance(deployer.address, V4_LIQUIDITY_MANAGER);
  if (aedAllowance < aedAmount) {
    const tx1 = await aedToken.approve(V4_LIQUIDITY_MANAGER, ethers.MaxUint256);
    await tx1.wait();
    console.log("✅ AED approved");
  } else {
    console.log("✅ AED already approved");
  }

  const inrAllowance = await inrToken.allowance(deployer.address, V4_LIQUIDITY_MANAGER);
  if (inrAllowance < inrAmount) {
    const tx2 = await inrToken.approve(V4_LIQUIDITY_MANAGER, ethers.MaxUint256);
    await tx2.wait();
    console.log("✅ INR approved");
  } else {
    console.log("✅ INR already approved");
  }

  // Step 2: Construct pool key (currencies MUST be sorted)
  const [currency0, currency1] = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase()
    ? [AED_TOKEN, INR_TOKEN]
    : [INR_TOKEN, AED_TOKEN];

  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS,
  };

  console.log("\n2️⃣ Pool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  console.log("\n3️⃣ Liquidity Parameters:");
  console.log(`Tick Lower: ${tickLower}`);
  console.log(`Tick Upper: ${tickUpper}`);
  console.log(`Liquidity Delta: ${liquidityDelta.toString()}`);
  console.log(`Amount0 Max: ${ethers.formatUnits(aedAmount, 6)} AED`);
  console.log(`Amount1 Max: ${ethers.formatUnits(inrAmount, 6)} INR`);

  // Step 4: Call router's addLiquidity with correct parameters
  console.log("\n4️⃣ Calling addLiquidity on V4LiquidityManager...");

  const router = new ethers.Contract(
    V4_LIQUIDITY_MANAGER,
    V4_ROUTER_ABI,
    deployer
  );

  try {
    const tx = await router.addLiquidity(
      poolKey,          // PoolKey struct
      tickLower,        // int24
      tickUpper,        // int24
      liquidityDelta,   // int256
      aedAmount,        // uint256 amount0Max
      inrAmount,        // uint256 amount1Max
      {
        gasLimit: 2000000,
      }
    );

    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      console.log("\n❌ Transaction REVERTED");
      throw new Error("Transaction reverted");
    }

    console.log("\n✅ Liquidity added successfully!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    const newAedBalance = await aedToken.balanceOf(deployer.address);
    const newInrBalance = await inrToken.balanceOf(deployer.address);

    console.log("\n📊 New Balances:");
    console.log(`AED: ${ethers.formatUnits(newAedBalance, 6)} AED`);
    console.log(`INR: ${ethers.formatUnits(newInrBalance, 6)} INR`);

    console.log(`\nTokens Spent:`);
    console.log(`AED: ${ethers.formatUnits(aedBalance - newAedBalance, 6)} AED`);
    console.log(`INR: ${ethers.formatUnits(inrBalance - newInrBalance, 6)} INR`);

    console.log("\n🔗 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/tx/${receipt.hash}`);

    console.log("\n✅ Success! Your pool now has liquidity!");
    console.log("You can now:");
    console.log("1. Test swaps on your TradeX frontend");
    console.log("2. Execute trades through V4");

  } catch (error) {
    console.error("\n❌ Transaction failed:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    if (error.message.includes("insufficient funds")) {
      console.log("\nYou need more Base Sepolia ETH for gas.");
      console.log("Get some from: https://www.alchemy.com/faucets/base-sepolia");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
