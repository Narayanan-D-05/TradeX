/**
 * Initialize Uniswap V4 Pool on Base Sepolia
 * MUST be done before adding liquidity
 */

const { ethers } = require("hardhat");

// Base Sepolia addresses
const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

// Pool parameters
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = "0x0000000000000000000000000000000000000000";

// Initial price: 1 AED = 22.727 INR
// sqrtPriceX96 = sqrt(price) * 2^96
// price = 22.727 (INR per AED in terms of currency1/currency0)
const SQRT_PRICE_X96 = "377680650705498097308424011251"; // From your deployment

// PoolManager ABI
const POOL_MANAGER_ABI = [
  "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)",
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

async function main() {
  console.log("\n🎯 Initialize Uniswap V4 Pool on Base Sepolia\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Ensure currencies are sorted
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

  console.log("📝 Pool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  // Calculate Pool ID
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    )
  );

  console.log("\n🆔 Pool ID:", poolId);

  // Connect to PoolManager
  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, deployer);

  // Check if pool already initialized
  console.log("\n🔍 Checking if pool is already initialized...");
  try {
    const slot0 = await poolManager.getSlot0(poolId);
    console.log("\n✅ Pool is ALREADY initialized!");
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());
    console.log("\n You can skip initialization and go directly to adding liquidity!");
    return;
  } catch (error) {
    console.log("❌ Pool is NOT initialized yet - proceeding with initialization...");
  }

  // Initialize the pool
  console.log("\n🚀 Initializing pool...");
  console.log("  Initial sqrtPriceX96:", SQRT_PRICE_X96);
  console.log("  This sets: 1 AED ≈ 22.727 INR");

  const hookData = "0x"; // No hook data

  try {
    const tx = await poolManager.initialize(
      poolKey,
      SQRT_PRICE_X96,
      hookData,
      {
        gasLimit: 1000000,
      }
    );

    console.log("\nTransaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      console.log("\n❌ Transaction REVERTED");
      throw new Error("Initialize transaction failed");
    }

    console.log("\n✅ Pool initialized successfully!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Parse the return value (tick)
    // The initialize function returns int24 tick
    console.log("\n📊 Initial State:");
    
    try {
      const slot0 = await poolManager.getSlot0(poolId);
      console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
      console.log("  tick:", slot0.tick.toString());
      console.log("  protocolFee:", slot0.protocolFee.toString());
      console.log("  lpFee:", slot0.lpFee.toString());

      // Decode price
      const sqrtPrice = Number(slot0.sqrtPriceX96) / (2 ** 96);
      const price = sqrtPrice * sqrtPrice;
      console.log("\n💱 Price:");
      console.log("  1 AED =", price.toFixed(4), "INR");
      console.log("  1 INR =", (1 / price).toFixed(6), "AED");

    } catch (error) {
      console.log("  (Could not query final state)");
    }

    console.log("\n🔗 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/tx/${receipt.hash}`);

    console.log("\n✅ SUCCESS! Pool is now initialized.");
    console.log("\n📝 Next Steps:");
    console.log("1. Run: npx hardhat run scripts/add-liquidity-v4-router.js --network baseSepolia");
    console.log("2. Add liquidity to the pool");
    console.log("3. Test swaps on your TradeX frontend");

  } catch (error) {
    console.error("\n❌ Failed to initialize pool:");
    console.error("Error:", error.message);

    if (error.data) {
      console.error("Error data:", error.data);
    }

    if (error.message.includes("already initialized")) {
      console.log("\n💡 Pool might already be initialized by someone else.");
      console.log("Check the pool state on BaseScan");
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
