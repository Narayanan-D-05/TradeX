const { ethers } = require('hardhat');

async function main() {
  console.log('🦄 TESTING V4 SWAP (Alternative Router)\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  // Alternative V4 deployment on Base Sepolia
  const ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';

  // Sort tokens
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const isAEDToken0 = token0 === AED;

  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  console.log('Pool: AED/INR (0.3% fee)');
  console.log('  Token0:', token0, isAEDToken0 ? '(AED)' : '(INR)');
  console.log('  Token1:', token1, isAEDToken0 ? '(INR)' : '(AED)');

  // Swap 1 INR → AED
  const swapAmount = ethers.parseUnits('1', 6); // 1 INR
  console.log('\n💱 Testing swap: 1 INR → AED');

  const inrToken = new ethers.Contract(INR, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
  ], signer);

  // Check balance
  const balance = await inrToken.balanceOf(signer.address);
  console.log('  INR balance:', ethers.formatUnits(balance, 6));

  if (balance < swapAmount) {
    console.log('  ❌ Insufficient INR balance!');
    return;
  }

  // Approve router
  console.log('\n📝 Approving INR...');
  const approval = await inrToken.approve(ROUTER, swapAmount);
  await approval.wait();
  console.log('  ✅ Approved');

  // Test swap with the standard swap() function
  const router = new ethers.Contract(
    ROUTER,
    [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, bytes hookData) external payable returns (int256 amount0, int256 amount1)',
      'function getPoolStatus(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint160,uint128)'
    ],
    signer
  );

  console.log('\n🎯 Executing swap...');
  
  try {
    // Get current price to set price limit
    const status = await router.getPoolStatus(poolKey);
    console.log('  Pool sqrtPriceX96:', status[0].toString());
    console.log('  Pool liquidity:', status[1].toString());

    if (status[1] === 0n) {
      console.log('  ❌ Pool has no liquidity!');
      return;
    }

    // Execute swap: INR (token1) → AED (token0)
    // zeroForOne = false (swapping token1 for token0)
    // Negative amount means exactInput (positive would be exactOutput)
    const tx = await router.swap(
      poolKey,
      false, // zeroForOne (false = token1 → token0, i.e., INR → AED)
      -BigInt(swapAmount), // Negative for exact input
      0n, // sqrtPriceLimitX96 (0 = no limit)
      '0x', // hookData
      { gasLimit: 300000 }
    );

    console.log('  Transaction:', tx.hash);
    console.log('  🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    console.log('  ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    
    console.log('\n✅ SWAP SUCCESSFUL!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   🔗 BaseScan:', `https://sepolia.basescan.org/tx/${tx.hash}`);

    // Check new balances
    const newINRBalance = await inrToken.balanceOf(signer.address);
    const aedToken = new ethers.Contract(AED, [
      'function balanceOf(address) view returns (uint256)'
    ], signer);
    const newAEDBalance = await aedToken.balanceOf(signer.address);

    console.log('\n💰 New balances:');
    console.log('  INR:', ethers.formatUnits(newINRBalance, 6));
    console.log('  AED:', ethers.formatUnits(newAEDBalance, 6));
    console.log('\n🎉 Uniswap V4 swap executed successfully!');
    
  } catch (error) {
    console.error('\n❌ Swap failed:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
