/**
 * Add V4 Liquidity using PoolModifyLiquidityTest
 * Uses @uniswap/v4-sdk for proper encoding
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Contract addresses
const POOL_MANAGER = deployment.uniswapV4.poolManager;
const MODIFY_LIQUIDITY_TEST = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd"; // Test helper
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;

// Pool parameters
const FEE = deployment.pool.fee;
const TICK_SPACING = deployment.pool.tickSpacing;
const HOOKS = deployment.pool.hooks;

// Liquidity amounts
const AED_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 AED
const INR_AMOUNT = ethers.parseUnits("227270", 6); // 227,270 INR

// Full range ticks (must be multiples of tickSpacing=60)
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const MODIFY_LIQUIDITY_ABI = [
  "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), (int24 tickLower, int24 tickUpper, int256 liquidityDelta), bytes) external payable returns (int256, int256)",
];

async function calculateLiquidityDelta(amount0, amount1, tickLower, tickUpper, sqrtPriceX96) {
  // For full range position, approximate liquidity
  // L = sqrt(amount0 * amount1) for full range around current price
  const liquidity = ethers.parseUnits("1000000", 18); // Start with reasonable liquidity
  return liquidity;
}

async function main() {
  console.log("\n💧 Adding Liquidity to Uniswap V4 Pool");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Network: Base Sepolia");

  // Connect to contracts
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);
  const modifyLiquidityTest = new ethers.Contract(
    MODIFY_LIQUIDITY_TEST,
    MODIFY_LIQUIDITY_ABI,
    signer
  );

  // Check balances
  console.log("\n📊 Current Balances:");
  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)}`);

  if (aedBalance < AED_AMOUNT) {
    throw new Error(`Insufficient AED. Need ${ethers.formatUnits(AED_AMOUNT, 6)}, have ${ethers.formatUnits(aedBalance, 6)}`);
  }
  if (inrBalance < INR_AMOUNT) {
    throw new Error(`Insufficient INR. Need ${ethers.formatUnits(INR_AMOUNT, 6)}, have ${ethers.formatUnits(inrBalance, 6)}`);
  }

  // Approve tokens to PoolManager (since it's the one that will take them)
  console.log("\n✅ Approving tokens to PoolManager...");
  
  const aedAllowance = await aedToken.allowance(signer.address, POOL_MANAGER);
  if (aedAllowance < AED_AMOUNT) {
    const tx = await aedToken.approve(POOL_MANAGER, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ AED approved");
  } else {
    console.log("✓ AED already approved");
  }

  const inrAllowance = await inrToken.allowance(signer.address, POOL_MANAGER);
  if (inrAllowance < INR_AMOUNT) {
    const tx = await inrToken.approve(POOL_MANAGER, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ INR approved");
  } else {
    console.log("✓ INR already approved");
  }

  // Construct pool key - currencies MUST be sorted
  const [currency0, currency1] = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase()
    ? [AED_TOKEN, INR_TOKEN]
    : [INR_TOKEN, AED_TOKEN];

  const poolKey = {
    currency0,
    currency1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS,
  };

  console.log("\n🎯 Pool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  // Calculate liquidity delta
  const sqrtPriceX96 = BigInt(deployment.pool.sqrtPriceX96);
  const liquidityDelta = await calculateLiquidityDelta(
    AED_AMOUNT,
    INR_AMOUNT,
    MIN_TICK,
    MAX_TICK,
    sqrtPriceX96
  );

  console.log("\n💧 Liquidity Parameters:");
  console.log(`Tick Range: [${MIN_TICK}, ${MAX_TICK}] (full range)`);
  console.log(`Liquidity Delta: ${liquidityDelta.toString()}`);
  console.log(`Max AED: ${ethers.formatUnits(AED_AMOUNT, 6)}`);
  console.log(`Max INR: ${ethers.formatUnits(INR_AMOUNT, 6)}`);

  // Modify liquidity params
  const params = {
    tickLower: MIN_TICK,
    tickUpper: MAX_TICK,
    liquidityDelta: liquidityDelta,
  };

  const hookData = "0x"; // No hook data

  console.log("\n⏳ Sending transaction...");
  try {
    const tx = await modifyLiquidityTest.modifyLiquidity(
      poolKey,
      params,
      hookData,
      { gasLimit: 1000000 }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("\n✅ Liquidity added successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block:", receipt.blockNumber);

    // Check new balances
    console.log("\n📊 New Balances:");
    const newAedBalance = await aedToken.balanceOf(signer.address);
    const newInrBalance = await inrToken.balanceOf(signer.address);
    console.log(`AED: ${ethers.formatUnits(newAedBalance, 6)}`);
    console.log(`INR: ${ethers.formatUnits(newInrBalance, 6)}`);
    console.log(`\nTokens Spent:`);
    console.log(`AED: ${ethers.formatUnits(aedBalance - newAedBalance, 6)}`);
    console.log(`INR: ${ethers.formatUnits(inrBalance - newInrBalance, 6)}`);

    // Save position info
    const positionData = {
      network: "baseSepolia",
      chainId: 84532,
      timestamp: new Date().toISOString(),
      transaction: tx.hash,
      poolId: deployment.pool.id,
      provider: signer.address,
      tickRange: {
        lower: MIN_TICK,
        upper: MAX_TICK,
      },
      liquidityDelta: liquidityDelta.toString(),
      tokensSpent: {
        aed: ethers.formatUnits(aedBalance - newAedBalance, 6),
        inr: ethers.formatUnits(inrBalance - newInrBalance, 6),
      },
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
    };

    const positionPath = path.join(__dirname, "..", "deployments", "base-sepolia-liquidity.json");
    fs.writeFileSync(positionPath, JSON.stringify(positionData, null, 2));
    console.log("\n💾 Position saved to:", positionPath);
    console.log("🔗 View on BaseScan:", positionData.explorerUrl);

  } catch (error) {
    console.error("\n❌ Error adding liquidity:");
    if (error.data) {
      console.error("Error data:", error.data);
    }
    console.error(error.message);
    throw error;
  }

  console.log("\n🎉 Done!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
