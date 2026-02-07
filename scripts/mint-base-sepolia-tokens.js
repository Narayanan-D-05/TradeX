/**
 * Mint AED and INR tokens on Base Sepolia for Adding V4 Liquidity
 */

const { ethers } = require('hardhat');
const deployment = require('../deployments/base-sepolia-deployment.json');

const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function faucet() external',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

async function main() {
  console.log('\n💰 Mint Base Sepolia Tokens for V4 Liquidity');
  console.log('=' .repeat(70));

  const [signer] = await ethers.getSigners();
  console.log(`\n📝 Address: ${signer.address}`);

  // Check Base Sepolia ETH balance
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log(`💎 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance < ethers.parseEther('0.001')) {
    console.log('\n❌ Insufficient ETH on Base Sepolia!');
    console.log('Get ETH from: https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  // Token addresses from deployment
  const aedAddress = deployment.tokens.AED_STABLE.address;
  const inrAddress = deployment.tokens.INR_STABLE.address;

  console.log(`\n📍 Token Addresses:`);
  console.log(`   AED: ${aedAddress}`);
  console.log(`   INR: ${inrAddress}`);

  // Connect to tokens
  const aedToken = new ethers.Contract(aedAddress, ERC20_ABI, signer);
  const inrToken = new ethers.Contract(inrAddress, ERC20_ABI, signer);

  // Check current balances
  const aedBefore = await aedToken.balanceOf(signer.address);
  const inrBefore = await inrToken.balanceOf(signer.address);

  console.log(`\n💵 Current Balances:`);
  console.log(`   AED: ${ethers.formatUnits(aedBefore, 6)}`);
  console.log(`   INR: ${ethers.formatUnits(inrBefore, 6)}`);

  // Mint amounts (enough for liquidity)
  const aedAmount = ethers.parseUnits('1000', 6); // 1,000 AED
  const inrAmount = ethers.parseUnits('22727', 6); // 22,727 INR (22.727:1 ratio)

  console.log(`\n🏭 Minting tokens...`);
  console.log(`   Target: 1,000 AED + 22,727 INR`);

  // Try minting AED
  console.log(`\n1️⃣  Minting AED...`);
  try {
    // Try faucet function first
    const aedTx = await aedToken.faucet();
    console.log(`   Transaction: ${aedTx.hash}`);
    await aedTx.wait();
    console.log(`   ✅ AED minted via faucet`);
  } catch (error) {
    console.log(`   ⚠️  Faucet failed, trying direct mint...`);
    try {
      const aedTx = await aedToken.mint(signer.address, aedAmount);
      console.log(`   Transaction: ${aedTx.hash}`);
      await aedTx.wait();
      console.log(`   ✅ AED minted`);
    } catch (mintError) {
      console.log(`   ❌ Mint failed: ${mintError.message}`);
      console.log(`   💡 You may need to mint from the token deployer account`);
    }
  }

  // Try minting INR
  console.log(`\n2️⃣  Minting INR...`);
  try {
    // Try faucet function first
    const inrTx = await inrToken.faucet();
    console.log(`   Transaction: ${inrTx.hash}`);
    await inrTx.wait();
    console.log(`   ✅ INR minted via faucet`);
  } catch (error) {
    console.log(`   ⚠️  Faucet failed, trying direct mint...`);
    try {
      const inrTx = await inrToken.mint(signer.address, inrAmount);
      console.log(`   Transaction: ${inrTx.hash}`);
      await inrTx.wait();
      console.log(`   ✅ INR minted`);
    } catch (mintError) {
      console.log(`   ❌ Mint failed: ${mintError.message}`);
      console.log(`   💡 You may need to mint from the token deployer account`);
    }
  }

  // Check final balances
  const aedAfter = await aedToken.balanceOf(signer.address);
  const inrAfter = await inrToken.balanceOf(signer.address);

  console.log(`\n✅ Final Balances:`);
  console.log(`   AED: ${ethers.formatUnits(aedAfter, 6)} (${ethers.formatUnits(aedAfter - aedBefore, 6)} added)`);
  console.log(`   INR: ${ethers.formatUnits(inrAfter, 6)} (${ethers.formatUnits(inrAfter - inrBefore, 6)} added)`);

  if (aedAfter > 0n && inrAfter > 0n) {
    console.log(`\n🎉 Success! You now have tokens on Base Sepolia!`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Open https://app.uniswap.org/pools`);
    console.log(`   2. Switch to Base Sepolia network`);
    console.log(`   3. Create new position with:`);
    console.log(`      - Token 0: AED (${aedAddress})`);
    console.log(`      - Token 1: INR (${inrAddress})`);
    console.log(`      - Fee: 0.3%`);
    console.log(`      - Amount: ~100 AED + ~2,273 INR (or any amount)`);
    console.log(`   4. Approve and add liquidity`);
    console.log(`\n💡 See V4_LIQUIDITY_MANUAL_GUIDE.md for detailed instructions`);
  } else {
    console.log(`\n⚠️  Token minting may have failed.`);
    console.log(`\n💡 Alternative Options:`);
    console.log(`   1. Use BaseScan to call faucet() directly:`);
    console.log(`      AED: https://sepolia.basescan.org/address/${aedAddress}#writeContract`);
    console.log(`      INR: https://sepolia.basescan.org/address/${inrAddress}#writeContract`);
    console.log(`\n   2. Or use Yellow Network instead (already working!)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
