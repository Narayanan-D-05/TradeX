/**
 * Deploy PoolModifyLiquidityTest and add liquidity
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const POOL_MANAGER = deployment.uniswapV4.poolManager;
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;
const FEE = deployment.pool.fee;
const TICK_SPACING = deployment.pool.tickSpacing;
const HOOKS = deployment.pool.hooks;

// Full range ticks
const MIN_TICK = -887220;
const MAX_TICK = 887220;

// Liquidity amounts
const AED_AMOUNT = ethers.parseUnits("1000", 6); // Start with 1,000 AED
const INR_AMOUNT = ethers.parseUnits("22727", 6); // 22,727 INR

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  console.log("\n💧 Deploy Test Contract and Add Liquidity");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Deployer:", signer.address);

  // Deploy PoolModifyLiquidityTest
  console.log("\n🚀 Deploying PoolModifyLiquidityTest...");
  const PoolModifyLiquidityTest = await ethers.getContractFactory("PoolModifyLiquidityTest");
  const testContract = await PoolModifyLiquidityTest.deploy(POOL_MANAGER);
  await testContract.waitForDeployment();
  const testAddress = await testContract.getAddress();
  console.log("✅ Deployed at:", testAddress);

  // Connect to tokens
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);

  // Check balances
  console.log("\n📊 Token Balances:");
  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)}`);

  // Wait a bit for deployment to settle
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Approve test contract
  console.log("\n✅ Approving tokens...");
  let tx = await aedToken.approve(testAddress, ethers.MaxUint256);
  await tx.wait();
  console.log("✓ AED approved");

  await new Promise(resolve => setTimeout(resolve, 2000));

  tx = await inrToken.approve(testAddress, ethers.MaxUint256);
  await tx.wait();
  console.log("✓ INR approved");

  // Prepare pool key
  const poolKey = {
    currency0: AED_TOKEN,
    currency1: INR_TOKEN,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS,
  };

  // Calculate liquidity delta using V4 formula
  // For a rough estimate: liquidity ≈ sqrt(amount0 * amount1)
  const liquidityDelta = ethers.parseUnits("100000", 18);

  const params = {
    tickLower: MIN_TICK,
    tickUpper: MAX_TICK,
    liquidityDelta: liquidityDelta,
  };

  console.log("\n💧 Adding Liquidity:");
  console.log(`Tick Range: [${MIN_TICK}, ${MAX_TICK}]`);
  console.log(`Liquidity: ${liquidityDelta.toString()}`);
  console.log(`Max AED: ${ethers.formatUnits(AED_AMOUNT, 6)}`);
  console.log(`Max INR: ${ethers.formatUnits(INR_AMOUNT, 6)}`);

  // Wait for approvals to be mined
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const addLiqTx = await testContract.modifyLiquidity(
      poolKey,
      params,
      "0x", // No hook data
      { gasLimit: 1000000 }
    );

    console.log("\n⏳ Transaction sent:", addLiqTx.hash);
    const receipt = await addLiqTx.wait();
    
    console.log("✅ SUCCESS!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    const newAedBalance = await aedToken.balanceOf(signer.address);
    const newInrBalance = await inrToken.balanceOf(signer.address);
    
    console.log("\n📊 Tokens Spent:");
    console.log(`AED: ${ethers.formatUnits(aedBalance - newAedBalance, 6)}`);
    console.log(`INR: ${ethers.formatUnits(inrBalance - newInrBalance, 6)}`);

    // Save results
    deployment.liquidityTest = testAddress;
    deployment.liquidity = {
      transaction: addLiqTx.hash,
      timestamp: new Date().toISOString(),
      tokensSpent: {
        aed: ethers.formatUnits(aedBalance - newAedBalance, 6),
        inr: ethers.formatUnits(inrBalance - newInrBalance, 6),
      },
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("\n💾 Updated deployment file");
    console.log("🔗 View on BaseScan: https://sepolia.basescan.org/tx/" + addLiqTx.hash);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Data:", error.data);
    }
    throw error;
  }

  console.log("\n🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
