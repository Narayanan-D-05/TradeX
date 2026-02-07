/**
 * Mint tokens for Uniswap V4 liquidity provision
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment addresses
const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const ERC20_ABI = [
  "function mint(address to, uint256 amount) public",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n💰 Minting Tokens for Liquidity");
  console.log("=================================\n");
  console.log("Deployer:", deployer.address);
  
  // Get token contracts
  const aedToken = await ethers.getContractAt(ERC20_ABI, deployment.contracts.AED_STABLE);
  const inrToken = await ethers.getContractAt(ERC20_ABI, deployment.contracts.INR_STABLE);
  
  const aedDecimals = await aedToken.decimals();
  const inrDecimals = await inrToken.decimals();
  const aedSymbol = await aedToken.symbol();
  const inrSymbol = await inrToken.symbol();
  
  console.log(`\n📋 Tokens:`);
  console.log(`  ${aedSymbol}: ${deployment.contracts.AED_STABLE}`);
  console.log(`  ${inrSymbol}: ${deployment.contracts.INR_STABLE}`);
  
  // Check current balances
  console.log(`\n📊 Current balances:`);
  const aedBalance = await aedToken.balanceOf(deployer.address);
  const inrBalance = await inrToken.balanceOf(deployer.address);
  console.log(`  ${aedSymbol}: ${ethers.formatUnits(aedBalance, aedDecimals)}`);
  console.log(`  ${inrSymbol}: ${ethers.formatUnits(inrBalance, inrDecimals)}`);
  
  // Mint amounts (enough for liquidity)
  const aedMintAmount = ethers.parseUnits("100000", aedDecimals); // 100k AED
  const inrMintAmount = ethers.parseUnits("2270000", inrDecimals); // 2.27M INR (22.7 ratio)
  
  console.log(`\n🔨 Minting tokens...`);
  console.log(`  ${aedSymbol}: ${ethers.formatUnits(aedMintAmount, aedDecimals)}`);
  console.log(`  ${inrSymbol}: ${ethers.formatUnits(inrMintAmount, inrDecimals)}`);
  
  // Mint AED
  console.log(`\n  Minting ${aedSymbol}...`);
  const tx1 = await aedToken.mint(deployer.address, aedMintAmount);
  await tx1.wait();
  console.log(`  ✅ ${aedSymbol} minted`);
  
  // Mint INR
  console.log(`  Minting ${inrSymbol}...`);
  const tx2 = await inrToken.mint(deployer.address, inrMintAmount);
  await tx2.wait();
  console.log(`  ✅ ${inrSymbol} minted`);
  
  // Check new balances
  console.log(`\n💰 New balances:`);
  const newAedBalance = await aedToken.balanceOf(deployer.address);
  const newInrBalance = await inrToken.balanceOf(deployer.address);
  console.log(`  ${aedSymbol}: ${ethers.formatUnits(newAedBalance, aedDecimals)}`);
  console.log(`  ${inrSymbol}: ${ethers.formatUnits(newInrBalance, inrDecimals)}`);
  
  console.log(`\n✅ Ready for liquidity provision!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
