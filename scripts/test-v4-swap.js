/**
 * Test V4 Pool with a Swap 
 * Uses the deployed SwapRouter on Base Sepolia
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
const deploymentPath = path.join(__dirname, "..", "deployments", "base-sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const SWAP_ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4";
const AED_TOKEN = deployment.tokens.AED_STABLE.address;
const INR_TOKEN = deployment.tokens.INR_STABLE.address;
const POOL_MANAGER = deployment.uniswapV4.poolManager;

const SWAP_AMOUNT = ethers.parseUnits("100", 6); // Swap 100 AED

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// SwapRouter ABI
const SWAP_ROUTER_ABI = [
  "function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), tuple(bool zeroForOne, int256 amountSpecified), bytes) external payable returns (int256, int256)",
];

async function main() {
  console.log("\n🔄 Testing V4 Pool with Swap");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Connect to contracts
  const aedToken = new ethers.Contract(AED_TOKEN, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(INR_TOKEN, ERC20_ABI, signer);
  const swapRouter = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, signer);

  // Check balances
  console.log("\n📊 Before Swap:");
  const aedBefore = await aedToken.balanceOf(signer.address);
  const inrBefore = await inrToken.balanceOf(signer.address);
  console.log(`AED: ${ethers.formatUnits(aedBefore, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrBefore, 6)}`);

  // Approve SwapRouter
  console.log("\n✅ Approving AED...");
  const allowance = await aedToken.allowance(signer.address, SWAP_ROUTER);
  if (allowance < SWAP_AMOUNT) {
    const tx = await aedToken.approve(SWAP_ROUTER, ethers.MaxUint256);
    await tx.wait();
    console.log("✓ Approved");
  } else {
    console.log("✓ Already approved");
  }

  // Pool key
  const poolKey = {
    currency0: AED_TOKEN,
    currency1: INR_TOKEN,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress,
  };

  // Swap params: swap 100 AED for INR
  const swapParams = {
    zeroForOne: true, // AED (currency0) -> INR (currency1)
    amountSpecified: SWAP_AMOUNT,
  };

  console.log("\n🔄 Executing Swap:");
  console.log(`Amount: ${ethers.formatUnits(SWAP_AMOUNT, 6)} AED`);
  console.log(`Direction: AED → INR`);

  try {
    const tx = await swapRouter.swap(
      poolKey,
      swapParams,
      "0x", // hookData
      { gasLimit: 500000 }
    );

    console.log("\n⏳ Transaction:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Swap successful!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balances
    console.log("\n📊 After Swap:");
    const aedAfter = await aedToken.balanceOf(signer.address);
    const inrAfter = await inrToken.balanceOf(signer.address);
    console.log(`AED: ${ethers.formatUnits(aedAfter, 6)}`);
    console.log(`INR: ${ethers.formatUnits(inrAfter, 6)}`);

    console.log("\n💱 Swap Results:");
    console.log(`AED spent: ${ethers.formatUnits(aedBefore - aedAfter, 6)}`);
    console.log(`INR received: ${ethers.formatUnits(inrAfter - inrBefore, 6)}`);

    const effectiveRate = (inrAfter - inrBefore) / (aedBefore - aedAfter);
    console.log(`Effective rate: 1 AED = ${effectiveRate.toFixed(4)} INR`);

    console.log("\n🔗 View on BaseScan:", `https://sepolia.basescan.org/tx/${tx.hash}`);

  } catch (error) {
    console.error("\n❌ Swap failed:");
    console.error(error.message);
    if (error.code === "CALL_EXCEPTION") {
      console.log("\n⚠️ This is expected - pool has no liquidity yet!");
      console.log("Pool is initialized but needs liquidity before swaps can execute.");
    }
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
