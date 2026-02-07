/**
 * Initialize Uniswap V4 Pool and Add Liquidity
 * Step 1: Initialize pool through PoolManager
 * Step 2: Add liquidity through PositionManager
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment addresses
const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// ====== CONTRACTS ======
const UNISWAP_V4 = {
  PoolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  PositionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
  Permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

// Use deployed tokens
const TOKENS = {
  INR: deployment.contracts.INR_STABLE,
  AED: deployment.contracts.AED_STABLE,
};

// Sort tokens
const [currency0, currency1] = 
  TOKENS.AED.toLowerCase() < TOKENS.INR.toLowerCase() 
    ? [TOKENS.AED, TOKENS.INR] 
    : [TOKENS.INR, TOKENS.AED];

const isAEDCurrency0 = currency0.toLowerCase() === TOKENS.AED.toLowerCase();

const FEE_TIER = 3000;
const TICK_SPACING = 60;
const HOOKS = ethers.ZeroAddress;

// ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
];

const POOL_MANAGER_ABI = [
  "function initialize(tuple(address,address,uint24,int24,address) key, uint160 sqrtPriceX96) external returns (int24 tick)",
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

const POSITION_MANAGER_ABI = [
  "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable",
];

// Helper: calculate sqrtPriceX96
function calculateSqrtPriceX96(price) {
  const sqrtPrice = Math.sqrt(price);
  const Q96 = BigInt(2) ** BigInt(96);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

// Helper: calculate liquidity
function calculateLiquidity(amount0, amount1) {
  const product = BigInt(amount0) * BigInt(amount1);
  let z = product;
  let y = BigInt(0);
  if (z > BigInt(3)) {
    y = z;
    let x = z / BigInt(2) + BigInt(1);
    while (x < y) {
      y = x;
      x = (z / x + x) / BigInt(2);
    }
  } else if (z !== BigInt(0)) {
    y = BigInt(1);
  }
  return y > BigInt(0) ? y : (BigInt(amount0) + BigInt(amount1));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n🦄 Uniswap V4: Initialize Pool + Add Liquidity");
  console.log("=".repeat(50));
  console.log("\nDeployer:", deployer.address);
  console.log("\nPool:", {
    currency0: currency0 + (isAEDCurrency0 ? " (AED)" : " (INR)"),
    currency1: currency1 + (isAEDCurrency0 ? " (INR)" : " (AED)"),
    fee: FEE_TIER / 10000 + "%",
    tickSpacing: TICK_SPACING,
  });
  
  // Get token contracts
  const token0 = await ethers.getContractAt(ERC20_ABI, currency0);
  const token1 = await ethers.getContractAt(ERC20_ABI, currency1);
  const symbol0 = await token0.symbol();
  const symbol1 = await token1.symbol();
  const decimals0 = await token0.decimals();
  const decimals1 = await token1.decimals();
  
  // Check balances
  console.log("\n1️⃣  Token balances:");
  const bal0 = await token0.balanceOf(deployer.address);
  const bal1 = await token1.balanceOf(deployer.address);
  console.log(`  ${symbol0}: ${ethers.formatUnits(bal0, decimals0)}`);
  console.log(`  ${symbol1}: ${ethers.formatUnits(bal1, decimals1)}`);
  
  if (bal0 === BigInt(0) || bal1 === BigInt(0)) {
    throw new Error("Run mint-for-liquidity.js first");
  }
  
  // Calculate pool ID
  const poolId = ethers.solidityPackedKeccak256(
    ["address", "address", "uint24", "int24", "address"],
    [currency0, currency1, FEE_TIER, TICK_SPACING, HOOKS]
  );
  
  // Check if pool exists
  console.log("\n2️⃣ Checking pool status...");
  const poolManager = await ethers.getContractAt(POOL_MANAGER_ABI, UNISWAP_V4.PoolManager);
  
  let poolExists = false;
  try {
    const slot0 = await poolManager.getSlot0(poolId);
    poolExists = slot0.sqrtPriceX96 !== BigInt(0);
    
    if (poolExists) {
      console.log("  ✅ Pool already initialized");
      console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
      console.log("  tick:", slot0.tick.toString());
    }
  } catch (e) {
    console.log("  Pool not initialized yet");
  }
  
  // Initialize pool if needed
  if (!poolExists) {
    console.log("\n3️⃣  Initializing pool...");
    
    // Calculate starting price: 1 AED = 22.727 INR
    const oraclePrice = 22.727;
    const price = isAEDCurrency0 ? oraclePrice : (1 / oraclePrice);
    const sqrtPriceX96 = calculateSqrtPriceX96(price);
    
    console.log("  Price (currency1/currency0):", price.toFixed(6));
    console.log("  sqrtPriceX96:", sqrtPriceX96.toString());
    
    const poolKey = [currency0, currency1, FEE_TIER, TICK_SPACING, HOOKS];
    
    try {
      const initTx = await poolManager.initialize(poolKey, sqrtPriceX96, {
        gasLimit: 500000,
      });
      
      console.log("  TX:", initTx.hash);
      await initTx.wait();
      console.log("  ✅ Pool initialized!");
      
    } catch (error) {
      console.error("  ❌ Failed:", error.message);
      throw error;
    }
  }
  
  // Approve tokens
  console.log("\n4️⃣  Approving tokens...");
  
  const allow0 = await token0.allowance(deployer.address, UNISWAP_V4.Permit2);
  if (allow0 < bal0) {
    console.log(`  Approving ${symbol0}...`);
    const tx = await token0.approve(UNISWAP_V4.Permit2, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ ${symbol0} approved`);
  } else {
    console.log(`  ✅ ${symbol0} pre-approved`);
  }
  
  const allow1 = await token1.allowance(deployer.address, UNISWAP_V4.Permit2);
  if (allow1 < bal1) {
    console.log(`  Approving ${symbol1}...`);
    const tx = await token1.approve(UNISWAP_V4.Permit2, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ ${symbol1} approved`);
  } else {
    console.log(`  ✅ ${symbol1} pre-approved`);
  }
  
  // Add liquidity
  console.log("\n5️⃣  Adding liquidity...");
  
  const amount0 = bal0 / BigInt(10); // 10% of balance
  const amount1 = bal1 / BigInt(10);
  
  console.log(`  ${symbol0}: ${ethers.formatUnits(amount0, decimals0)}`);
  console.log(`  ${symbol1}: ${ethers.formatUnits(amount1, decimals1)}`);
  
  const liquidity = calculateLiquidity(amount0, amount1);
  const tickLower = -887220;
  const tickUpper = 887220;
  
  // Encode actions
  const MINT_POSITION = 0;
  const SETTLE_PAIR = 4;
  
  const actions = ethers.solidityPacked(["uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR]);
  
  // Encode mint params
  const poolKey = [currency0, currency1, FEE_TIER, TICK_SPACING, HOOKS];
  
  const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
    [poolKey, tickLower, tickUpper, liquidity, amount0, amount1, deployer.address, "0x"]
  );
  
  const settleParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address"],
    [currency0, currency1]
  );
  
  const unlockData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes", "bytes[]"],
    [actions, [mintParams, settleParams]]
  );
  
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  const positionManager = await ethers.getContractAt(POSITION_MANAGER_ABI, UNISWAP_V4.PositionManager);
  
  try {
    console.log("  Estimating gas...");
    const gas = await positionManager.modifyLiquidities.estimateGas(unlockData, deadline);
    console.log("  Gas:", gas.toString());
    
    console.log("  Sending transaction...");
    const tx = await positionManager.modifyLiquidities(unlockData, deadline, {
      gasLimit: gas * BigInt(120) / BigInt(100),
    });
    
    console.log("  TX:", tx.hash);
    await tx.wait();
    
    console.log("\n✅ SUCCESS! Liquidity added!");
    
    const newBal0 = await token0.balanceOf(deployer.address);
    const newBal1 = await token1.balanceOf(deployer.address);
    
    console.log("\n📊 Liquidity provided:");
    console.log(`  ${symbol0}: ${ethers.formatUnits(bal0 - newBal0, decimals0)}`);
    console.log(`  ${symbol1}: ${ethers.formatUnits(bal1 - newBal1, decimals1)}`);
    
    console.log("\n🎉 Pool is ready for swaps!");
    
  } catch (error) {
    console.error("\n❌ Failed to add liquidity:");
    console.error("  ", error.message);
    if (error.data) console.error("  Data:", error.data);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
