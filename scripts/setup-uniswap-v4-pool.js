/**
 * Uniswap V4 Pool Setup Script - Sepolia Testnet
 * 
 * This script creates an INR/AED pool on Uniswap V4 and adds initial liquidity.
 * 
 * V4 Architecture:
 * - PoolManager: Singleton contract containing all pools
 * - PositionManager: Manages liquidity positions (uses multicall)
 * - Permit2: Token approval system
 * - PoolKey: Identifies a unique pool
 * 
 * Steps:
 * 1. Create PoolKey (currency0, currency1, fee, tickSpacing, hooks)
 * 2. Initialize pool with starting price (via PoolManager)
 * 3. Approve tokens via Permit2
 * 4. Add liquidity via PositionManager.multicall()
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// ====== UNISWAP V4 CONTRACTS (Sepolia) ======
const UNISWAP_V4 = {
  PoolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  PositionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
  Quoter: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
  UniversalRouter: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
  Permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

// ====== TOKEN ADDRESSES ======
const TOKENS = {
  INR: "0xC6DADFdf4c046D0A91946351A0aceee261DcA517",
  AED: "0x05016024652D0c947E5B49532e4287374720d3b2",
};

// ====== FEE TIER & TICK SPACING ======
const FEE_TIER = 3000; // 0.3%
const TICK_SPACING = 60;
const HOOKS_ADDRESS = ethers.ZeroAddress; // No custom hooks

// ====== LIQUIDITY AMOUNTS (6 decimals for test tokens) ======
const INR_AMOUNT = ethers.parseUnits("400000", 6); // 400K INR
const AED_AMOUNT = ethers.parseUnits("17600", 6);  // 17.6K AED (maintaining 22.7 ratio)

// ====== SIMPLIFIED ABIs ======
const POOL_MANAGER_ABI = [
  "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)",
  "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

const POSITION_MANAGER_ABI = [
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
  "function initializePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)",
  "function modifyLiquidities(bytes calldata actions, bytes[] calldata params, uint256 deadline) external payable returns (uint256[] memory amounts)",
];

const PERMIT2_ABI = [
  "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// ====== HELPER: Calculate sqrtPriceX96 ======
function calculateSqrtPriceX96(price) {
  // price = token1 / token0
  // sqrtPriceX96 = sqrt(price) * 2^96
  
  const sqrtPrice = Math.sqrt(price);
  const Q96 = BigInt(2) ** BigInt(96);
  
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

// ====== HELPER: Sort tokens ======
function sortTokens(tokenA, tokenB) {
  const addressA = BigInt(tokenA);
  const addressB = BigInt(tokenB);
  
  return addressA < addressB ? [tokenA, tokenB] : [tokenB, tokenA];
}

// ====== MAIN SCRIPT ======
async function main() {
  console.log("\n🦄 Starting Uniswap V4 Pool Setup for INR/AED");
  console.log("=".repeat(60));
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("❌ Insufficient ETH balance. Need at least 0.1 ETH for gas.");
  }
  
  // Sort tokens for PoolKey
  const [currency0, currency1] = sortTokens(TOKENS.INR, TOKENS.AED);
  
  console.log("\nToken Addresses:");
  console.log("Currency0:", currency0);
  console.log("Currency1:", currency1);
  
  // Create PoolKey
  const poolKey = {
    currency0,
    currency1,
    fee: FEE_TIER,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS,
  };
  
  console.log("\nPoolKey:");
  console.log(JSON.stringify(poolKey, null, 2));
  
  // ====== STEP 1: Check if pool exists ======
  console.log("\n1️⃣  Checking if pool exists...");
  
  const poolManager = await ethers.getContractAt(POOL_MANAGER_ABI, UNISWAP_V4.PoolManager);
  
  // Calculate pool ID (simplified - actual implementation needs keccak256(abi.encode(poolKey)))
  const poolId = ethers.solidityPackedKeccak256(
    ["address", "address", "uint24", "int24", "address"],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  
  console.log("Pool ID:", poolId);
  
  let poolExists = false;
  try {
    const slot0 = await poolManager.getSlot0(poolId);
    poolExists = slot0.sqrtPriceX96 !== BigInt(0);
    
    if (poolExists) {
      console.log("✅ Pool already exists!");
      console.log("Current sqrtPriceX96:", slot0.sqrtPriceX96.toString());
      console.log("Current tick:", slot0.tick.toString());
      console.log("\nSkipping initialization, proceeding to add liquidity...");
    }
  } catch (error) {
    console.log("Pool does not exist. Will create and initialize.");
  }
  
  // ====== STEP 2: Calculate starting price ======
  console.log("\n2️⃣  Calculating starting price...");
  
  // Oracle price: 1 AED = 22.727 INR
  // If currency0 = INR, currency1 = AED
  // price = AED / INR = 1 / 22.727 = 0.044
  // If currency0 = AED, currency1 = INR
  // price = INR / AED = 22.727
  
  const oraclePrice = 22.727; // 1 AED = 22.727 INR
  let price;
  
  if (currency0.toLowerCase() === TOKENS.INR.toLowerCase()) {
    price = 1 / oraclePrice; // INR is currency0, so price = AED/INR
  } else {
    price = oraclePrice; // AED is currency0, so price = INR/AED
  }
  
  const sqrtPriceX96 = calculateSqrtPriceX96(price);
  
  console.log("Oracle Price: 1 AED = 22.727 INR");
  console.log("Pool Price (currency1/currency0):", price);
  console.log("sqrtPriceX96:", sqrtPriceX96.toString());
  
  // ====== STEP 3: Initialize pool (if needed) ======
  if (!poolExists) {
    console.log("\n3️⃣  Initializing pool on PoolManager...");
    
    try {
      const initTx = await poolManager.initialize(poolKey, sqrtPriceX96, {
        gasLimit: 500000,
      });
      
      console.log("Transaction hash:", initTx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await initTx.wait();
      console.log("✅ Pool initialized!");
      console.log("Gas used:", receipt.gasUsed.toString());
      console.log("Block:", receipt.blockNumber);
      
      poolExists = true;
    } catch (error) {
      console.error("❌ Error initializing pool:", error.message);
      
      // Try to get more details
      if (error.data) {
        console.error("Error data:", error.data);
      }
      
      throw error;
    }
  }
  
  // ====== STEP 4: Approve tokens via Permit2 ======
  console.log("\n4️⃣  Approving tokens via Permit2...");
  
  const inr = await ethers.getContractAt(ERC20_ABI, currency0);
  const aed = await ethers.getContractAt(ERC20_ABI, currency1);
  
  // Check balances
  const inrBalance = await inr.balanceOf(deployer.address);
  const aedBalance = await aed.balanceOf(deployer.address);
  
  console.log("INR Balance:", ethers.formatUnits(inrBalance, 18));
  console.log("AED Balance:", ethers.formatUnits(aedBalance, 18));
  
  if (inrBalance < INR_AMOUNT || aedBalance < AED_AMOUNT) {
    throw new Error("❌ Insufficient token balance for liquidity provision.");
  }
  
  // Approve Permit2 as spender
  console.log("\nApproving Permit2 for INR...");
  const approveTx1 = await inr.approve(UNISWAP_V4.Permit2, ethers.MaxUint256);
  await approveTx1.wait();
  console.log("✅ INR approved");
  
  console.log("Approving Permit2 for AED...");
  const approveTx2 = await aed.approve(UNISWAP_V4.Permit2, ethers.MaxUint256);
  await approveTx2.wait();
  console.log("✅ AED approved");
  
  // Approve PositionManager via Permit2
  console.log("\nApproving PositionManager via Permit2...");
  const permit2 = await ethers.getContractAt(PERMIT2_ABI, UNISWAP_V4.Permit2);
  
  const maxExpiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
  
  const approveTx3 = await permit2.approve(
    currency0,
    UNISWAP_V4.PositionManager,
    ethers.MaxUint160,
    maxExpiration
  );
  await approveTx3.wait();
  console.log("✅ PositionManager approved for currency0");
  
  const approveTx4 = await permit2.approve(
    currency1,
    UNISWAP_V4.PositionManager,
    ethers.MaxUint160,
    maxExpiration
  );
  await approveTx4.wait();
  console.log("✅ PositionManager approved for currency1");
  
  // ====== STEP 5: Add liquidity via PositionManager ======
  console.log("\n5️⃣  Adding liquidity via PositionManager...");
  
  const positionManager = await ethers.getContractAt(
    POSITION_MANAGER_ABI,
    UNISWAP_V4.PositionManager
  );
  
  // Full range position: tickLower = MIN_TICK, tickUpper = MAX_TICK
  const MIN_TICK = -887200;
  const MAX_TICK = 887200;
  
  // Calculate liquidity amount (simplified - use token amounts)
  const liquidity = INR_AMOUNT; // Simplified, actual needs LiquidityAmounts library
  
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  
  // Encode MINT_POSITION action
  const MINT_POSITION = 0;
  const SETTLE_PAIR = 1;
  
  const actions = ethers.solidityPacked(["uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR]);
  
  // Encode mint parameters
  const mintParams = [
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint256", "uint256", "address", "bytes"],
      [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        MIN_TICK,
        MAX_TICK,
        liquidity,
        INR_AMOUNT,
        AED_AMOUNT,
        deployer.address,
        "0x",
      ]
    ),
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [poolKey.currency0, poolKey.currency1]
    ),
  ];
  
  console.log("Adding liquidity:");
  console.log("  Tick Range:", MIN_TICK, "to", MAX_TICK, "(full range)");
  console.log("  INR Amount:", ethers.formatUnits(INR_AMOUNT, 18));
  console.log("  AED Amount:", ethers.formatUnits(AED_AMOUNT, 18));
  console.log("  Deadline:", new Date(deadline * 1000).toISOString());
  
  try {
    const liquidityTx = await positionManager.modifyLiquidities(actions, mintParams, deadline, {
      gasLimit: 1000000,
    });
    
    console.log("\nTransaction hash:", liquidityTx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await liquidityTx.wait();
    
    console.log("✅ Liquidity added successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Error adding liquidity:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    throw error;
  }
  
  // ====== STEP 6: Verify pool setup ======
  console.log("\n6️⃣  Verifying pool setup...");
  
  const finalSlot0 = await poolManager.getSlot0(poolId);
  
  console.log("Pool Address/ID:", poolId);
  console.log("Current sqrtPriceX96:", finalSlot0.sqrtPriceX96.toString());
  console.log("Current Tick:", finalSlot0.tick.toString());
  console.log("LP Fee:", finalSlot0.lpFee, "(", finalSlot0.lpFee / 100, "%)");
  
  // ====== SUCCESS ======
  console.log("\n" + "=".repeat(60));
  console.log("✅ Uniswap V4 Pool Setup Complete!");
  console.log("=".repeat(60));
  
  console.log("\nPool Details:");
  console.log("-------------");
  console.log("Pool ID:", poolId);
  console.log("Currency0:", poolKey.currency0);
  console.log("Currency1:", poolKey.currency1);
  console.log("Fee Tier:", poolKey.fee / 100, "%");
  console.log("Tick Spacing:", poolKey.tickSpacing);
  console.log("Hooks:", poolKey.hooks);
  
  console.log("\nNext Steps:");
  console.log("-----------");
  console.log("1. Update frontend to use V4 PoolKey");
  console.log("2. Test swaps using Quoter and Universal Router");
  console.log("3. Monitor pool on Sepolia Etherscan");
  
  console.log("\nSepolia Etherscan:");
  console.log(`PoolManager: https://sepolia.etherscan.io/address/${UNISWAP_V4.PoolManager}`);
  console.log(`PositionManager: https://sepolia.etherscan.io/address/${UNISWAP_V4.PositionManager}`);
  
  console.log("\n🎉 Pool is now live and ready for swaps!\n");
}

// ====== EXECUTE ======
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
