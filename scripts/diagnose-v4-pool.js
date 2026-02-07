/**
 * Diagnose V4 Pool State on Base Sepolia
 * Check pool initialization, liquidity, and tick state
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

// PoolManager ABI for state queries
const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 id) external view returns (uint128 liquidity)",
  "function getPosition(bytes32 id, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) external view returns (uint128 liquidity)",
];

async function main() {
  console.log("\n🔍 V4 Pool State Diagnostics\n");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Construct PoolKey (currencies MUST be sorted)
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

  // Calculate Pool ID (keccak256(abi.encode(poolKey)))
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    )
  );

  console.log("\n🆔 Pool ID:", poolId);
  console.log("Expected:", "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281");
  console.log("Match:", poolId === "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281" ? "✅" : "❌");

  // Connect to PoolManager
  const poolManager = new ethers.Contract(POOL_MANAGER, POOL_MANAGER_ABI, signer);

  // Query pool state
  console.log("\n📊 Querying Pool State...");

  try {
    const slot0 = await poolManager.getSlot0(poolId);
    console.log("\n✅ Slot0 Data:");
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());
    console.log("  protocolFee:", slot0.protocolFee.toString());
    console.log("  lpFee:", slot0.lpFee.toString());

    // Decode price from sqrtPriceX96
    const sqrtPrice = Number(slot0.sqrtPriceX96) / (2 ** 96);
    const price = sqrtPrice * sqrtPrice;
    console.log("\n💱 Current Price:");
    console.log("  Price (token1/token0):", price.toFixed(6));
    console.log("  1 AED =", price.toFixed(4), "INR");
    console.log("  1 INR =", (1 / price).toFixed(6), "AED");

  } catch (error) {
    console.log("\n❌ Failed to get Slot0:");
    console.log("  Error:", error.message);
    console.log("\n⚠️  Pool might not be initialized!");
    return;
  }

  try {
    const liquidity = await poolManager.getLiquidity(poolId);
    console.log("\n💧 Current Liquidity:", liquidity.toString());
    
    if (liquidity === 0n) {
      console.log("⚠️  WARNING: Pool has ZERO liquidity!");
      console.log("This is expected - pool is initialized but has no liquidity yet.");
    } else {
      console.log("✅ Pool has existing liquidity!");
    }

  } catch (error) {
    console.log("\n❌ Failed to get liquidity:");
    console.log("  Error:", error.message);
  }

  // Check position at full range
  console.log("\n🎯 Checking Position at Full Range:");
  const fullRangeLower = -887220;
  const fullRangeUpper = 887220;

  try {
    const position = await poolManager.getPosition(
      poolId,
      signer.address,
      fullRangeLower,
      fullRangeUpper,
      ethers.ZeroHash
    );
    console.log("  Position liquidity:", position.toString());
    
    if (position === 0n) {
      console.log("  ℹ️  No existing position at this range");
    } else {
      console.log("  ✅ Existing position found!");
    }

  } catch (error) {
    console.log("  ❌ Error checking position:", error.message);
  }

  // Suggest valid tick ranges
  console.log("\n📐 Valid Tick Ranges (divisible by tickSpacing=60):");
  console.log("  Full range: -887220 to 887220");
  console.log("  Narrow range: -600 to 600");
  console.log("  Current tick range: -120 to 120");

  // Try callStatic to see what would happen
  console.log("\n🧪 Testing liquidity addition with callStatic...");
  
  const V4_LIQUIDITY_MANAGER = "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd";
  const routerAbi = [
    "function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, int256 liquidityDelta, uint256 amount0Max, uint256 amount1Max) external returns (int256 delta0, int256 delta1)",
  ];
  
  const router = new ethers.Contract(V4_LIQUIDITY_MANAGER, routerAbi, signer);
  
  const testAmounts = {
    aed: ethers.parseUnits("10", 6),
    inr: ethers.parseUnits("227", 6),
  };
  
  const testLiquidity = 2270000000000000n; // Small test amount

  try {
    console.log("  Testing with:");
    console.log("    Tick range: -887220 to 887220");
    console.log("    Liquidity:", testLiquidity.toString());
    console.log("    Amount0Max:", ethers.formatUnits(testAmounts.aed, 6), "AED");
    console.log("    Amount1Max:", ethers.formatUnits(testAmounts.inr, 6), "INR");

    const result = await router.addLiquidity.staticCall(
      poolKey,
      fullRangeLower,
      fullRangeUpper,
      testLiquidity,
      testAmounts.aed,
      testAmounts.inr
    );

    console.log("\n✅ callStatic SUCCESS! Liquidity addition would work!");
    console.log("  Delta0:", result[0].toString());
    console.log("  Delta1:", result[1].toString());
    console.log("\n🎉 You can safely execute the transaction!");

  } catch (error) {
    console.log("\n❌ callStatic FAILED - this is why your transaction reverts:");
    console.log("  Error:", error.message);
    
    if (error.data) {
      console.log("  Error data:", error.data);
      
      // Try to decode common errors
      const errorSig = error.data.slice(0, 10);
      console.log("  Error signature:", errorSig);
      
      const knownErrors = {
        "0x3b99b53d": "Custom V4 error (check tick bounds or liquidity math)",
        "0x4e487b71": "Panic(uint256) - arithmetic error",
        "0x": "Empty revert (check requires/asserts failed)",
      };
      
      if (knownErrors[errorSig]) {
        console.log("  Decoded:", knownErrors[errorSig]);
      }
    }

    console.log("\n💡 Suggestions:");
    console.log("  1. Try smaller liquidity delta");
    console.log("  2. Try narrower tick range (-600 to 600)");
    console.log("  3. Verify token balances and approvals");
    console.log("  4. Check PoolManager on BaseScan for recent successful addLiquidity calls");
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
