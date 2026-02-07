/**
 * Add Liquidity to Uniswap V4 Pool using V4 SDK
 * Base Sepolia Network
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load Base Sepolia deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Contract addresses
const POOL_MANAGER = deployment.uniswapV4.poolManager;
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;
const UNLOCK_HELPER = deployment.helpers.unlockHelper;
const POOL_ID = deployment.pool.id;

// Pool parameters
const FEE = deployment.pool.fee;
const TICK_SPACING = deployment.pool.tickSpacing;
const HOOKS = deployment.pool.hooks;

// Liquidity amounts to add
const AED_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 AED
const INR_AMOUNT = ethers.parseUnits("227270", 6); // 227,270 INR (10k * 22.727)

// Full range positions
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
];

const POOL_MANAGER_ABI = [
  "function unlock(bytes calldata data) external returns (bytes memory)",
];

// Create a custom LiquidityManager contract interface
const LIQUIDITY_MANAGER_ABI = [
  "function addLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta, uint256 amount0Max, uint256 amount1Max) params) external returns (int256 liquidityDelta)",
];

async function main() {
  console.log("\n🔷 Adding Liquidity to Uniswap V4 Pool (Base Sepolia)");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Connect to tokens
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);

  // Check balances
  console.log("\n📊 Token Balances:");
  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)}`);

  if (aedBalance < AED_AMOUNT) {
    throw new Error(`Insufficient AED balance. Need ${ethers.formatUnits(AED_AMOUNT, 6)}`);
  }
  if (inrBalance < INR_AMOUNT) {
    throw new Error(`Insufficient INR balance. Need ${ethers.formatUnits(INR_AMOUNT, 6)}`);
  }

  // Deploy a proper PositionManager helper if needed
  console.log("\n🔧 Deploying PositionManager Helper...");
  
  const PositionManager = await ethers.getContractFactory("PositionManagerHelper");
  const positionManager = await PositionManager.deploy(POOL_MANAGER);
  await positionManager.waitForDeployment();
  const positionManagerAddress = await positionManager.getAddress();
  
  console.log("PositionManager deployed:", positionManagerAddress);

  // Approve tokens
  console.log("\n✅ Approving tokens...");
  
  const aedAllowance = await aedToken.allowance(signer.address, positionManagerAddress);
  if (aedAllowance < AED_AMOUNT) {
    const approveTx = await aedToken.approve(positionManagerAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log("✓ AED approved");
  } else {
    console.log("✓ AED already approved");
  }

  const inrAllowance = await inrToken.allowance(signer.address, positionManagerAddress);
  if (inrAllowance < INR_AMOUNT) {
    const approveTx = await inrToken.approve(positionManagerAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log("✓ INR approved");
  } else {
    console.log("✓ INR already approved");
  }

  // Construct pool key
  const poolKey = {
    currency0: AED_TOKEN,
    currency1: INR_TOKEN,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS,
  };

  console.log("\n🎯 Pool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  // Add liquidity
  console.log("\n💧 Adding liquidity...");
  console.log(`Amount AED: ${ethers.formatUnits(AED_AMOUNT, 6)}`);
  console.log(`Amount INR: ${ethers.formatUnits(INR_AMOUNT, 6)}`);
  console.log(`Tick Range: [${MIN_TICK}, ${MAX_TICK}] (full range)`);

  try {
    const addLiquidityTx = await positionManager.addLiquidity(
      poolKey,
      {
        tickLower: MIN_TICK,
        tickUpper: MAX_TICK,
        liquidityDelta: ethers.parseUnits("1000000", 18), // Desired liquidity
        amount0Max: AED_AMOUNT,
        amount1Max: INR_AMOUNT,
      },
      { gasLimit: 500000 }
    );

    console.log("Transaction sent:", addLiquidityTx.hash);
    const receipt = await addLiquidityTx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check final balances
    console.log("\n📊 Final Token Balances:");
    const finalAedBalance = await aedToken.balanceOf(signer.address);
    const finalInrBalance = await inrToken.balanceOf(signer.address);
    console.log(`AED: ${ethers.formatUnits(finalAedBalance, 6)}`);
    console.log(`INR: ${ethers.formatUnits(finalInrBalance, 6)}`);
    console.log(`AED spent: ${ethers.formatUnits(aedBalance - finalAedBalance, 6)}`);
    console.log(`INR spent: ${ethers.formatUnits(inrBalance - finalInrBalance, 6)}`);

    // Save position details
    const positionData = {
      network: "baseSepolia",
      timestamp: new Date().toISOString(),
      poolId: POOL_ID,
      positionManager: positionManagerAddress,
      transaction: addLiquidityTx.hash,
      tickRange: { lower: MIN_TICK, upper: MAX_TICK },
      amounts: {
        aed: ethers.formatUnits(AED_AMOUNT, 6),
        inr: ethers.formatUnits(INR_AMOUNT, 6),
      },
      gasUsed: receipt.gasUsed.toString(),
    };

    const positionPath = path.join(__dirname, "..", "deployments", "base-sepolia-position.json");
    fs.writeFileSync(positionPath, JSON.stringify(positionData, null, 2));
    console.log("\n💾 Position data saved to:", positionPath);

  } catch (error) {
    console.error("\n❌ Error adding liquidity:");
    console.error(error);
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
