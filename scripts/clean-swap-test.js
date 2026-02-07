const { ethers } = require('hardhat');

async function main() {
  console.log('💱 CLEAN V4 SWAP TEST\n');

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

  // Check balances BEFORE
  const aedBefore = await aedToken.balanceOf(signer.address);
  const inrBefore = await inrToken.balanceOf(signer.address);
  console.log('BEFORE:');
  console.log('  AED:', ethers.formatUnits(aedBefore, 6));
  console.log('  INR:', ethers.formatUnits(inrBefore, 6));

  // Approve
  console.log('\nApproving 100 AED to router...');
  const approveTx = await aedToken.approve(TRADEX_ROUTER, ethers.parseUnits('100', 6));
  await approveTx.wait();
  console.log('  ✅ Approved');

  // Swap 10 AED → INR (zeroForOne = true since AED = token0)
  const router = new ethers.Contract(
    TRADEX_ROUTER,
    [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable',
    ],
    signer
  );

  const swapAmount = ethers.parseUnits('10', 6);
  const MIN_SQRT_PRICE = 4295128739n + 1n;

  console.log('\nSwapping 10 AED → INR...');
  const tx = await router.swap(
    poolKey,
    {
      zeroForOne: true, // AED(token0) → INR(token1)
      amountSpecified: -BigInt(swapAmount), // Negative = exact input
      sqrtPriceLimitX96: MIN_SQRT_PRICE
    },
    '0x',
    { gasLimit: 500000 }
  );

  console.log('TX:', tx.hash);
  console.log('🔗 https://sepolia.basescan.org/tx/' + tx.hash);

  const receipt = await tx.wait();
  console.log('Block:', receipt.blockNumber);
  console.log('Gas:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status);
  console.log('Logs:', receipt.logs.length);

  // Wait a moment then re-check
  await new Promise(r => setTimeout(r, 3000));

  const aedAfter = await aedToken.balanceOf(signer.address);
  const inrAfter = await inrToken.balanceOf(signer.address);
  console.log('\nAFTER:');
  console.log('  AED:', ethers.formatUnits(aedAfter, 6));
  console.log('  INR:', ethers.formatUnits(inrAfter, 6));

  const aedChange = Number(ethers.formatUnits(aedAfter - aedBefore, 6));
  const inrChange = Number(ethers.formatUnits(inrAfter - inrBefore, 6));
  console.log('\nCHANGES:');
  console.log('  AED:', aedChange > 0 ? '+' : '', aedChange.toFixed(6));
  console.log('  INR:', inrChange > 0 ? '+' : '', inrChange.toFixed(6));

  if (inrChange > 0) {
    console.log('\n✅ SWAP WORKED! Got', inrChange.toFixed(2), 'INR for 10 AED');
    console.log('  Rate: 1 AED =', (inrChange / Math.abs(aedChange)).toFixed(4), 'INR');
  } else if (aedChange === 0 && inrChange === 0) {
    console.log('\n⚠️ No balance change - swap may have returned 0 output');
    console.log('  Pool may have insufficient liquidity at current tick');
  }

  console.log('\n🔗 Verify on BaseScan:', `https://sepolia.basescan.org/tx/${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
