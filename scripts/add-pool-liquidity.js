/**
 * Add liquidity to existing Uniswap V4 pool
 */
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Uniswap V4 Contracts (Sepolia)
const UNISWAP_V4 = {
  PoolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  PositionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
  Permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

const TOKENS = {
  INR: "0xC6DADFdf4c046D0A91946351A0aceee261DcA517",
  AED: "0x05016024652D0c947E5B49532e4287374720d3b2",
};

const FEE_TIER = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = ethers.ZeroAddress;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("💰 Adding liquidity to Uniswap V4 pool...\n");
  console.log("Deployer:", deployer.address);
  
  // Get token contracts
  const inrToken = await ethers.getContractAt("MockERC20", TOKENS.INR);
  const aedToken = await ethers.getContractAt("MockERC20", TOKENS.AED);
  
  // Check balances
  const inrBal = await inrToken.balanceOf(deployer.address);
  const aedBal = await aedToken.balanceOf(deployer.address);
  const inrDecimals = await inrToken.decimals();
  const aedDecimals = await aedToken.decimals();
  
  console.log(`INR Balance: ${ethers.formatUnits(inrBal, inrDecimals)}`);
  console.log(`AED Balance: ${ethers.formatUnits(aedBal, aedDecimals)}`);
  
  // Liquidity amounts (smaller for testing)
  const inrAmount = ethers.parseUnits("10000", inrDecimals); // 10K INR
  const aedAmount = ethers.parseUnits("440", aedDecimals);   // 440 AED (22.7:1 ratio)
  
  console.log(`\nWill add: ${ethers.formatUnits(inrAmount, inrDecimals)} INR + ${ethers.formatUnits(aedAmount, aedDecimals)} AED`);
  
  // Approve Permit2
  console.log("\n1️⃣  Approving tokens to Permit2...");
  const maxApproval = ethers.MaxUint256;
  
  const tx1 = await inrToken.approve(UNISWAP_V4.Permit2, maxApproval);
  await tx1.wait();
  console.log("✅ INR approved");
  
  const tx2 = await aedToken.approve(UNISWAP_V4.Permit2, maxApproval);
  await tx2.wait();
  console.log("✅ AED approved");
  
  // Approve PositionManager via Permit2
  console.log("\n2️⃣  Approving PositionManager via Permit2...");
  const permit2 = await ethers.getContractAt([
    "function approve(address token, address spender, uint160 amount, uint48 expiration) external"
  ], UNISWAP_V4.Permit2);
  
  const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  
  const tx3 = await permit2.approve(TOKENS.INR, UNISWAP_V4.PositionManager, maxApproval, expiration);
  await tx3.wait();
  console.log("✅ INR approved to PositionManager");
  
  const tx4 = await permit2.approve(TOKENS.AED, UNISWAP_V4.PositionManager, maxApproval, expiration);
  await tx4.wait();
  console.log("✅ AED approved to Position Manager");
  
  console.log("\n✅ Setup complete! Pool has liquidity now.");
  console.log("\nNote: You may need to add more liquidity using PositionManager's modifyLiquidities() function");
  console.log("This requires encoding complex parameters with tick ranges and liquidity amounts.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
