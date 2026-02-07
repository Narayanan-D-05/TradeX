const { ethers } = require('hardhat');

async function main() {
  console.log('💱 TESTING SWAP via TradeXV4Router\n');

  const [signer] = await ethers.getSigners();
  console.log('Wallet:', signer.address);

  const TRADEX_ROUTER = '0x20f91dAB56838b879B95A0318476DEe96C0e792C';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';

  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];

  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  const erc20ABI = [
    'function approve(address, uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
  ];

  const aedToken = new ethers.Contract(AED, erc20ABI, signer);
  const inrToken = new ethers.Contract(INR, erc20ABI, signer);

  // Check balances before
  const aedBefore = await aedToken.balanceOf(signer.address);
  const inrBefore = await inrToken.balanceOf(signer.address);
  console.log('💰 Balances BEFORE swap:');
  console.log('  AED:', ethers.formatUnits(aedBefore, 6));
  console.log('  INR:', ethers.formatUnits(inrBefore, 6));

  // Approve tokens to our router
  const approveAmount = ethers.parseUnits('100', 6);
  console.log('\n📝 Approving tokens to TradeXV4Router...');
  await (await inrToken.approve(TRADEX_ROUTER, approveAmount)).wait();
  await (await aedToken.approve(TRADEX_ROUTER, approveAmount)).wait();
  console.log('  ✅ Both approved');

  const router = new ethers.Contract(
    TRADEX_ROUTER,
    [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable',
    ],
    signer
  );

  // Swap 10 INR → AED
  const swapAmount = ethers.parseUnits('10', 6);
  
  // INR is token1, AED is token0
  // INR → AED means token1 → token0, so zeroForOne = false
  // For !zeroForOne, price limit should be MAX
  const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n;
  
  console.log('\n🎯 Swapping 10 INR → AED...');
  console.log('  zeroForOne: false (token1→token0)');
  console.log('  amountSpecified: -10000000 (exact input)');

  try {
    const tx = await router.swap(
      poolKey,
      {
        zeroForOne: false,
        amountSpecified: -BigInt(swapAmount), // Negative = exact input
        sqrtPriceLimitX96: MAX_SQRT_PRICE
      },
      '0x',
      { gasLimit: 500000 }
    );

    console.log('\n📤 Transaction sent!');
    console.log('  Hash:', tx.hash);
    console.log('  🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    console.log('  ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('\n✅ SWAP CONFIRMED!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   Events:', receipt.logs.length);

    // Decode swap event
    for (const log of receipt.logs) {
      console.log('   Log topic[0]:', log.topics[0]?.substring(0, 10));
    }

    // Check balances after
    const aedAfter = await aedToken.balanceOf(signer.address);
    const inrAfter = await inrToken.balanceOf(signer.address);
    console.log('\n💰 Balances AFTER swap:');
    console.log('  AED:', ethers.formatUnits(aedAfter, 6));
    console.log('  INR:', ethers.formatUnits(inrAfter, 6));

    const aedDiff = aedAfter - aedBefore;
    const inrDiff = inrAfter - inrBefore;
    console.log('\n📊 Changes:');
    console.log('  AED:', aedDiff > 0 ? '+' : '', ethers.formatUnits(aedDiff, 6));
    console.log('  INR:', inrDiff > 0 ? '+' : '', ethers.formatUnits(inrDiff, 6));
    
    if (aedDiff > 0) {
      const rate = Number(ethers.formatUnits(inrDiff < 0 ? -inrDiff : inrDiff, 6)) / Number(ethers.formatUnits(aedDiff, 6));
      console.log('  Effective rate: 1 AED =', rate.toFixed(4), 'INR');
    }

    console.log('\n🎉 SUCCESS! TradeXV4Router swap works with real transaction hash!');
    console.log('🔗 Transaction:', `https://sepolia.basescan.org/tx/${tx.hash}`);

  } catch (err) {
    console.error('\n❌ Swap failed:', err.message);
    if (err.data) console.error('   Data:', err.data);
    
    // Try the reverse direction: AED → INR (zeroForOne = true)
    console.log('\n🔄 Trying reverse direction: 10 AED → INR...');
    const MIN_SQRT_PRICE = 4295128739n + 1n;
    
    try {
      const tx2 = await router.swap(
        poolKey,
        {
          zeroForOne: true,
          amountSpecified: -BigInt(swapAmount),
          sqrtPriceLimitX96: MIN_SQRT_PRICE
        },
        '0x',
        { gasLimit: 500000 }
      );
      
      console.log('  Hash:', tx2.hash);
      console.log('  🔗 https://sepolia.basescan.org/tx/' + tx2.hash);
      const receipt2 = await tx2.wait();
      console.log('  ✅ SWAP CONFIRMED! Block:', receipt2.blockNumber);
      
      const aedAfter2 = await aedToken.balanceOf(signer.address);
      const inrAfter2 = await inrToken.balanceOf(signer.address);
      console.log('  AED:', ethers.formatUnits(aedAfter2, 6));
      console.log('  INR:', ethers.formatUnits(inrAfter2, 6));
      
    } catch (err2) {
      console.error('  ❌ Reverse also failed:', err2.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
