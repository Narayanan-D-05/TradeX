const { ethers } = require('hardhat');

async function main() {
  console.log('💰 ADDING LIQUIDITY TO AED/INR POOL (Alternative V4)\n');

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

  // Check balances
  const aedToken = new ethers.Contract(AED, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)'
  ], signer);

  const inrToken = new ethers.Contract(INR, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)'
  ], signer);

  const aedBalance = await aedToken.balanceOf(signer.address);
  const inrBalance = await inrToken.balanceOf(signer.address);
  const aedDecimals = await aedToken.decimals();
  const inrDecimals = await inrToken.decimals();

  console.log('\n💰 Available balances:');
  console.log('  AED:', ethers.formatUnits(aedBalance, aedDecimals));
  console.log('  INR:', ethers.formatUnits(inrBalance, inrDecimals));

  // Adding 1000 AED + 22,727 INR
  const aedAmount = 1000n * 10n**BigInt(aedDecimals);
  const inrAmount = 22727n * 10n**BigInt(inrDecimals);

  console.log('\n📊 Adding liquidity:');
  console.log('  AED:', ethers.formatUnits(aedAmount, aedDecimals));
  console.log('  INR:', ethers.formatUnits(inrAmount, inrDecimals));

  if (aedBalance < aedAmount || inrBalance < inrAmount) {
    console.log('\n❌ Insufficient balance!');
    return;
  }

  // Approve tokens
  console.log('\n📝 Approving tokens...');
  const aedApproval = await aedToken.approve(ROUTER, aedAmount);
  await aedApproval.wait();
  console.log('  ✅ AED approved');

  const inrApproval = await inrToken.approve(ROUTER, inrAmount);
  await inrApproval.wait();
  console.log('  ✅ INR approved');

  // Get pool status
  const router = new ethers.Contract(
    ROUTER,
    [
      'function getPoolStatus((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (uint160 sqrtPriceX96, uint128 liquidity)',
      'function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable'
    ],
    signer
  );

  const status = await router.getPoolStatus(poolKey);
  console.log('\n📊 Pool status:');
  console.log('  sqrtPriceX96:', status.sqrtPriceX96.toString());
  console.log('  Current liquidity:', status.liquidity.toString());

  if (status.sqrtPriceX96 === 0n) {
    console.log('  ❌ Pool not initialized! Run init-alt-base-pool.js first.');
    return;
  }

  // Calculate liquidity delta
  // For full range: L = amount0 * sqrtPriceX96 / 2^96
  const Q96 = 2n ** 96n;
  const token0Amount = isAEDToken0 ? aedAmount : inrAmount;
  const liquidityDelta = (token0Amount * status.sqrtPriceX96) / Q96;

  console.log('  Liquidity delta:', liquidityDelta.toString());

  // Add liquidity
  console.log('\n📤 Adding liquidity...');
  try {
    const gasEstimate = await router.addLiquidity.estimateGas(
      poolKey,
      {
        tickLower: -887220, // Full range
        tickUpper: 887220,
        liquidityDelta: liquidityDelta,
        salt: ethers.ZeroHash
      },
      '0x'
    );

    console.log('  Gas estimate:', gasEstimate.toString());

    const tx = await router.addLiquidity(
      poolKey,
      {
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: liquidityDelta,
        salt: ethers.ZeroHash
      },
      '0x',
      { gasLimit: gasEstimate * 120n / 100n }
    );

    console.log('  Transaction:', tx.hash);
    console.log('  🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    console.log('  ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('\n✅ Liquidity added!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());

    // Check new balances
    const newAedBalance = await aedToken.balanceOf(signer.address);
    const newInrBalance = await inrToken.balanceOf(signer.address);

    console.log('\n💰 Remaining balances:');
    console.log('  AED:', ethers.formatUnits(newAedBalance, aedDecimals));
    console.log('  INR:', ethers.formatUnits(newInrBalance, inrDecimals));

    // Check pool liquidity
    const newStatus = await router.getPoolStatus(poolKey);
    console.log('\n📊 New pool status:');
    console.log('  Liquidity:', newStatus.liquidity.toString());

    console.log('\n🎉 SUCCESS! Pool is now operational with liquidity!');
    console.log('\n💡 Update your frontend to use alternative V4 addresses:');
    console.log('   PoolManager: 0x1b832D5395A41446b508632466cf32c6C07D63c7');
    console.log('   Router: 0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0');

  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
