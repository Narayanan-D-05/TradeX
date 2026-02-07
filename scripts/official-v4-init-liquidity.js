/**
 * Initialize Pool with Official V4 PoolManager and Add Liquidity
 * Uses official Uniswap V4 contracts from docs.uniswap.org
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment with OFFICIAL contracts
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// OFFICIAL V4 Contracts (from docs.uniswap.org)
const POOL_MANAGER = deployment.uniswapV4.poolManager;
const POSITION_MANAGER = deployment.uniswapV4.positionManager;
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;

// Pool parameters
const FEE = 3000; // 0.3%
const TICK_SPACING = 60;
const HOOKS = ethers.ZeroAddress;

// Liquidity amounts
const AED_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 AED
const INR_AMOUNT = ethers.parseUnits("227270", 6); // 227,270 INR

// Price: 1 AED = 22.727 INR
// sqrtPriceX96 = sqrt(22.727) * 2^96 = 377680650705498097308424011251
const SQRT_PRICE_X96 = "377680650705498097308424011251";

// Full range ticks
const MIN_TICK = -887220;
const MAX_TICK = 887220;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
];

const POOL_MANAGER_ABI = [
  "function initialize((address,address,uint24,int24,address), uint160, bytes) external returns (int24)",
];

const POSITION_MANAGER_ABI = [
  "function modifyLiquidities(bytes, uint256) external payable",
  "function initializePool((address,address,uint24,int24,address), uint160, bytes) external payable returns (int24)",
];

async function main() {
  console.log("\n🚀 Official V4 Pool Initialization & Liquidity");
  console.log("=".repeat(60));
  console.log("Using OFFICIAL Uniswap V4 contracts");
  console.log("Source: https://docs.uniswap.org/contracts/v4/deployments");

  const [signer] = await ethers.getSigners();
  console.log("\nDeployer:", signer.address);

  // Connect to contracts
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);
  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, signer);
  const positionManager = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, signer);

  // Check balances
  console.log("\n📊 Token Balances:");
  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)}`);

  // Pool key (currencies MUST be sorted)
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

  // Step 1: Initialize Pool
  console.log("\n📝 Step 1: Initialize Pool");
  try {
    const initTx = await positionManager.initializePool(
      poolKey,
      SQRT_PRICE_X96,
      "0x", // hookData
      { gasLimit: 500000 }
    );

    console.log("Transaction:", initTx.hash);
    const receipt = await initTx.wait();
    console.log("✅ Pool initialized!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Compute pool ID
    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      )
    );
    console.log("Pool ID:", poolId);

  } catch (error) {
    if (error.message.includes("already initialized") || error.message.includes("PoolAlreadyInitialized")) {
      console.log("⚠️ Pool already initialized (OK - will add liquidity)");
    } else {
      console.error("❌ Pool initialization failed:");
      console.error(error.message);
      throw error;
    }
  }

  // Step 2: Approve tokens to PositionManager
  console.log("\n✅ Step 2: Approve Tokens");
  
  const aedAllowance = await aedToken.allowance(signer.address, POSITION_MANAGER);
  if (aedAllowance < AED_AMOUNT) {
    const tx = await aedToken.approve(POSITION_MANAGER, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ AED approved");
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("✓ AED already approved");
  }

  const inrAllowance = await inrToken.allowance(signer.address, POSITION_MANAGER);
  if (inrAllowance < INR_AMOUNT) {
    const tx = await inrToken.approve(POSITION_MANAGER, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ INR approved");
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("✓ INR already approved");
  }

  // Step 3: Add Liquidity
  console.log("\n💧 Step 3: Add Liquidity");
  console.log(`Amount AED: ${ethers.formatUnits(AED_AMOUNT, 6)}`);
  console.log(`Amount INR: ${ethers.formatUnits(INR_AMOUNT, 6)}`);
  console.log(`Tick Range: [${MIN_TICK}, ${MAX_TICK}]`);

  try {
    // Encode modifyLiquidities call
    // This follows the official V4 PositionManager interface
    const actions = ethers.concat([
      "0x00", // INCREASE_LIQUIDITY action
    ]);

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address", "int24", "int24", "uint256", "uint256", "uint256", "address", "bytes"],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks,
        MIN_TICK,
        MAX_TICK,
        1000000, // liquidity amount
        AED_AMOUNT, // amount0Max
        INR_AMOUNT, // amount1Max
        signer.address, // recipient
        "0x" // hookData
      ]
    );

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const tx = await positionManager.modifyLiquidities(
      ethers.concat([actions, params]),
      deadline,
      { gasLimit: 1000000 }
    );

    console.log("\n⏳ Transaction:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    const newAedBalance = await aedToken.balanceOf(signer.address);
    const newInrBalance = await inrToken.balanceOf(signer.address);

    console.log("\n📊 Tokens Spent:");
    console.log(`AED: ${ethers.formatUnits(aedBalance - newAedBalance, 6)}`);
    console.log(`INR: ${ethers.formatUnits(inrBalance - newInrBalance, 6)}`);

    // Save results
    deployment.officialPool = {
      poolManager: POOL_MANAGER,
      positionManager: POSITION_MANAGER,
      initTransaction: tx.hash,
      timestamp: new Date().toISOString(),
      tokensDeposited: {
        aed: ethers.formatUnits(aedBalance - newAedBalance, 6),
        inr: ethers.formatUnits(inrBalance - newInrBalance, 6),
      },
      explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("\n💾 Updated deployment file");
    console.log("🔗 View on BaseScan:", deployment.officialPool.explorerUrl);

  } catch (error) {
    console.error("\n❌ Error adding liquidity:");
    console.error(error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
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
