/**
 * Add Liquidity using Official PoolModifyLiquidityTest
 * Official Uniswap V4 deployment on Base Sepolia
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// OFFICIAL V4 Contracts
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const MODIFY_LIQUIDITY_TEST = "0x37429cd17cb1454c34e7f50b09725202fd533039";
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;

// Pool parameters
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS = ethers.ZeroAddress;

// Liquidity amounts - start conservative
const AED_AMOUNT = ethers.parseUnits("100", 6); // 100 AED
const INR_AMOUNT = ethers.parseUnits("2273", 6); // 2,273 INR (100 * 22.73)

// Price: 1 AED = 22.727 INR
const SQRT_PRICE_X96 = "377680650705498097308424011251";

// Full range ticks (aligned to tick spacing)
const MIN_TICK = -887220;
const MAX_TICK = 887220;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const POOL_MANAGER_ABI = [
  "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)",
];

const MODIFY_LIQUIDITY_ABI = [
  "function modifyLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta) params, bytes hookData) external payable returns (int256, int256)",
];

async function main() {
  console.log("\n💧 Add Liquidity with Official V4 Contracts");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Connect to contracts
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);
  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, signer);
  const modifyLiquidityTest = new ethers.Contract(MODIFY_LIQUIDITY_TEST, MODIFY_LIQUIDITY_ABI, signer);

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

  // Step 1: Initialize pool if not already done
  console.log("\n📝 Step 1: Initialize Pool");
  try {
    const initTx = await poolManager.initialize(
      poolKey,
      SQRT_PRICE_X96,
      "0x",
      { gasLimit: 500000 }
    );
    console.log("Init TX:", initTx.hash);
    await initTx.wait();
    console.log("✅ Pool initialized");
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    if (error.message.includes("PoolAlreadyInitialized") || error.message.includes("already initialized")) {
      console.log("✓ Pool already initialized");
    } else {
      console.error("❌ Init error:", error.message);
    }
  }

  // Step 2: Approve tokens to TEST CONTRACT
  console.log("\n✅ Step 2: Approve Tokens to Test Contract");

  const aedAllowance = await aedToken.allowance(signer.address, MODIFY_LIQUIDITY_TEST);
  if (aedAllowance < AED_AMOUNT) {
    const tx = await aedToken.approve(MODIFY_LIQUIDITY_TEST, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ AED approved");
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("✓ AED already approved");
  }

  const inrAllowance = await inrToken.allowance(signer.address, MODIFY_LIQUIDITY_TEST);
  if (inrAllowance < INR_AMOUNT) {
    const tx = await inrToken.approve(MODIFY_LIQUIDITY_TEST, ethers.MaxUint256);
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

  // Calculate liquidity delta (approximate for full range)
  // const liquidityDelta = ethers.parseUnits("10000", 18); // TOO BIG?
  const liquidityDelta = 1000000n; // Try tiny amount

  const params = {
    tickLower: MIN_TICK,
    tickUpper: MAX_TICK,
    liquidityDelta: liquidityDelta,
  };

  try {
    // Debug: Simulate with callStatic
    try {
      console.log("\n🕵️ Simulating transaction with callStatic...");
      await modifyLiquidityTest.modifyLiquidity.staticCall(
        poolKey,
        params,
        "0x", // hookData
        { gasLimit: 1000000 }
      );
      console.log("✅ Simulation successful! Proceeding...");
    } catch (e) {
      console.error("\n❌ Simulation Failed!");
      console.error("Reason:", e.message);
      if (e.data) {
        console.error("Data:", e.data);
        // Common V4 Error Selectors
        const errors = {
          "0x486aa307": "PoolNotInitialized()",
          "0x7983c051": "PoolAlreadyInitialized()",
          "0x2083cd40": "InvalidPool()",
          "0x48f5c3ed": "InvalidCaller()",
          "0x3b99b53d": "Unknown_3b99b53d",
          "0x5212cba1": "Unknown_5212cba1",
        };
        const selector = e.data.slice(0, 10);
        if (errors[selector]) {
          console.error("🎯 Decoded Error:", errors[selector]);
        } else {
          console.error("Unknown Selector:", selector);
        }
      }
      return;
    }

    const tx = await modifyLiquidityTest.modifyLiquidity(
      poolKey,
      params,
      "0x", // hookData
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
    deployment.liquidityAdded = {
      timestamp: new Date().toISOString(),
      transaction: tx.hash,
      poolManager: POOL_MANAGER,
      tokensDeposited: {
        aed: ethers.formatUnits(aedBalance - newAedBalance, 6),
        inr: ethers.formatUnits(inrBalance - newInrBalance, 6),
      },
      explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("\n💾 Updated deployment file");
    console.log("🔗 View on BaseScan:", deployment.liquidityAdded.explorerUrl);

  } catch (error) {
    console.error("\n❌ Error adding liquidity:");
    console.error(error.message);
    if (error.shortMessage) {
      console.error("Short:", error.shortMessage);
    }
  }

  console.log("\n🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
