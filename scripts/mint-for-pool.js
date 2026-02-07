/**
 * Mint tokens for Uniswap V4 pool liquidity
 */
const hre = require("hardhat");

const TOKENS = {
  INR: "0xC6DADFdf4c046D0A91946351A0aceee261DcA517",
  AED: "0x05016024652D0c947E5B49532e4287374720d3b2",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🪙 Minting tokens for Uniswap V4 pool...\n");
  console.log("Deployer:", deployer.address);
  console.log("INR Token:", TOKENS.INR);
  console.log("AED Token:", TOKENS.AED);
  
  const inrToken = await hre.ethers.getContractAt("MockERC20", TOKENS.INR);
  const aedToken = await hre.ethers.getContractAt("MockERC20", TOKENS.AED);
  
  // Mint large amounts for liquidity (18 decimals)
  const inrAmount = hre.ethers.parseUnits("1000000", 18); // 1M INR
  const aedAmount = hre.ethers.parseUnits("44000", 18);   // 44K AED
  
  console.log("\n📤 Minting INR...");
  try {
    const tx1 = await inrToken.faucet();
    await tx1.wait();
    console.log("✅ INR faucet TX:", tx1.hash);
  } catch (e) {
    console.log("⚠️ Faucet failed, trying direct mint...");
    try {
      const tx = await inrToken.mint(deployer.address, inrAmount);
      await tx.wait();
      console.log("✅ INR minted TX:", tx.hash);
    } catch (e2) {
      console.log("❌ Failed:", e2.message);
    }
  }
  
  console.log("\n📤 Minting AED...");
  try {
    const tx2 = await aedToken.faucet();
    await tx2.wait();
    console.log("✅ AED faucet TX:", tx2.hash);
  } catch (e) {
    console.log("⚠️ Faucet failed, trying direct mint...");
    try {
      const tx = await aedToken.mint(deployer.address, aedAmount);
      await tx.wait();
      console.log("✅ AED minted TX:", tx.hash);
    } catch (e2) {
      console.log("❌ Failed:", e2.message);
    }
  }
  
  // Check balances
  console.log("\n💰 Current Balances:");
  const inrBal = await inrToken.balanceOf(deployer.address);
  const aedBal = await aedToken.balanceOf(deployer.address);
  const inrDecimals = await inrToken.decimals();
  const aedDecimals = await aedToken.decimals();
  
  console.log(`  INR: ${hre.ethers.formatUnits(inrBal, inrDecimals)} (decimals: ${inrDecimals})`);
  console.log(`  AED: ${hre.ethers.formatUnits(aedBal, aedDecimals)} (decimals: ${aedDecimals})`);
  
  console.log("\n✅ Done! Now run: npx hardhat run scripts/setup-uniswap-v4-pool.js --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
