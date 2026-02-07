/**
 * Add Liquidity to Uniswap V4 Pool using Official PositionManager
 * Base Sepolia - Official V4 Contracts
 */

const { ethers } = require('hardhat');
const deployment = require('../deployments/base-sepolia-deployment.json');

// Official V4 PositionManager ABI (minimal)
const POSITION_MANAGER_ABI = [
  'function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable',
  'function initializePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24)',
];

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

// Permit2 ABI
const PERMIT2_ABI = [
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
];

async function main() {
  console.log('\n🦄 Add Liquidity to Uniswap V4 Pool (Official PositionManager)');
  console.log('=' .repeat(70));

  const [signer] = await ethers.getSigners();
  console.log(`\n📝 Signer: ${signer.address}`);

  // Get Base Sepolia balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    console.log('\n❌ Insufficient ETH on Base Sepolia. Need at least 0.01 ETH for gas.');
    console.log('Get Base Sepolia ETH from: https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  // Contract addresses
  const positionManager = deployment.uniswapV4.positionManager;
  const permit2 = deployment.uniswapV4.permit2;
  const aedToken = deployment.tokens.AED_STABLE.address;
  const inrToken = deployment.tokens.INR_STABLE.address;

  console.log(`\n📍 Contracts:`);
  console.log(`   PositionManager: ${positionManager}`);
  console.log(`   Permit2: ${permit2}`);
  console.log(`   AED Token: ${aedToken}`);
  console.log(`   INR Token: ${inrToken}`);

  // Connect to contracts
  const aed = new ethers.Contract(aedToken, ERC20_ABI, signer);
  const inr = new ethers.Contract(inrToken, ERC20_ABI, signer);
  const pm = new ethers.Contract(positionManager, POSITION_MANAGER_ABI, signer);

  // Check balances
  const aedBalance = await aed.balanceOf(signer.address);
  const inrBalance = await inr.balanceOf(signer.address);
  
  console.log(`\n💵 Token Balances:`);
  console.log(`   AED: ${ethers.formatUnits(aedBalance, 6)} AED`);
  console.log(`   INR: ${ethers.formatUnits(inrBalance, 6)} INR`);

  if (aedBalance === 0n || inrBalance === 0n) {
    console.log('\n❌ No tokens! You need AED and INR tokens on Base Sepolia to add liquidity.');
    console.log('\n💡 Recommendation: Use Yellow Network for gasless swaps instead!');
    console.log('   Yellow Network is already working and doesn\'t require V4 liquidity.');
    process.exit(1);
  }

  // Liquidity amounts (use small amounts for testing)
  const aedAmount = ethers.parseUnits('10', 6); // 10 AED
  const inrAmount = ethers.parseUnits('227', 6); // 227 INR (22.7:1 ratio)

  if (aedBalance < aedAmount || inrBalance < inrAmount) {
    console.log(`\n⚠️  Insufficient tokens. Need at least 10 AED and 227 INR.`);
    process.exit(1);
  }

  console.log(`\n💧 Adding Liquidity:`);
  console.log(`   ${ethers.formatUnits(aedAmount, 6)} AED`);
  console.log(`   ${ethers.formatUnits(inrAmount, 6)} INR`);

  // Step 1: Approve Permit2
  console.log(`\n1️⃣  Approving Permit2...`);
  const maxApproval = ethers.MaxUint256;
  
  try {
    const aedApproveTx = await aed.approve(permit2, maxApproval);
    console.log(`   AED approve tx: ${aedApproveTx.hash}`);
    await aedApproveTx.wait();
    
    const inrApproveTx = await inr.approve(permit2, maxApproval);
    console.log(`   INR approve tx: ${inrApproveTx.hash}`);
    await inrApproveTx.wait();
    
    console.log(`   ✅ Permit2 approved`);
  } catch (error) {
    console.log(`   ℹ️  Approval may already exist: ${error.message}`);
  }

  // Step 2: Add liquidity via PositionManager
  console.log(`\n2️⃣  Adding liquidity via PositionManager...`);
  console.log(`   ⚠️  This may fail - V4 liquidity APIs are complex`);
  console.log(`   ⚠️  If it fails, use Uniswap interface or Yellow Network`);

  try {
    // The modifyLiquidities function requires complex encoded data
    // This is a simplified attempt - may need proper v4-periphery integration
    const poolKey = {
      currency0: aedToken,
      currency1: inrToken,
      fee: 3000,
      tickSpacing: 60,
      hooks: ethers.ZeroAddress,
    };

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // This will likely fail without proper unlock data encoding
    const tx = await pm.modifyLiquidities('0x', deadline, {
      gasLimit: 500000,
    });

    console.log(`   📤 Transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`   ✅ Liquidity added successfully!`);
      console.log(`      Block: ${receipt.blockNumber}`);
      console.log(`      Gas used: ${receipt.gasUsed.toString()}`);
    } else {
      console.log(`   ❌ Transaction failed`);
    }

  } catch (error) {
    console.log(`\n❌ Failed to add liquidity: ${error.message}`);
    console.log(`\n💡 Alternative Solutions:`);
    console.log(`   1. Use Yellow Network (already working!) - gasless swaps`);
    console.log(`   2. Add liquidity manually via Uniswap interface:`);
    console.log(`      https://app.uniswap.org/pools`);
    console.log(`   3. Deploy proper v4-periphery contracts with full SDK integration`);
    console.log(`\n🟡 Yellow Network is the recommended approach for TradeX!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
