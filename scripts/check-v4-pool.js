/**
 * Check Uniswap V4 Pool Status
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment addresses
const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const UNISWAP_V4 = {
  PoolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
};

const TOKENS = {
  INR: deployment.contracts.INR_STABLE,
  AED: deployment.contracts.AED_STABLE,
};

const [currency0, currency1] = 
  TOKENS.AED.toLowerCase() < TOKENS.INR.toLowerCase() 
    ? [TOKENS.AED, TOKENS.INR] 
    : [TOKENS.INR, TOKENS.AED];

const FEE_TIER = 3000;
const TICK_SPACING = 60;
const HOOKS = ethers.ZeroAddress;

const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

async function main() {
  console.log("\n🔍 Checking Uniswap V4 Pool Status");
  console.log("====================================\n");
  
  console.log("Pool Configuration:");
  console.log("  currency0:", currency0);
  console.log("  currency1:", currency1);
  console.log("  fee:", FEE_TIER);
  console.log("  tickSpacing:", TICK_SPACING);
  console.log("  hooks:", HOOKS);
  
  // Calculate pool ID
  const poolId = ethers.solidityPackedKeccak256(
    ["address", "address", "uint24", "int24", "address"],
    [currency0, currency1, FEE_TIER, TICK_SPACING, HOOKS]
  );
  
  console.log("\nPool ID:", poolId);
  
  // Check pool state
  const poolManager = await ethers.getContractAt(POOL_MANAGER_ABI, UNISWAP_V4.PoolManager);
  
  try {
    const slot0 = await poolManager.getSlot0(poolId);
    
    console.log("\n📊 Pool State:");
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());
    console.log("  protocolFee:", slot0.protocolFee.toString());
    console.log("  lpFee:", slot0.lpFee.toString());
    
    if (slot0.sqrtPriceX96 === BigInt(0)) {
      console.log("\n❌ Pool NOT initialized (sqrtPriceX96 = 0)");
    } else {
      console.log("\n✅ Pool IS initialized");
      
      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
      const Q96 = BigInt(2) ** BigInt(96);
      const price = Number((sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96));
      
      console.log("  Current price (currency1/currency0):", price.toFixed(6));
    }
    
  } catch (error) {
    console.error("\n❌ Error checking pool:");
    console.error("  ", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
