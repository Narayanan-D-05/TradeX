const { ethers } = require('hardhat');

async function main() {
  console.log('✅ VERIFYING POOL INITIALIZATION\n');

  const [signer] = await ethers.getSigners();
  
  const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
  const AED = '0xd16B4e66c77048D68e6438068AfBBf4c96506d7F';
  const INR = '0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a';
  
  const [token0, token1] = AED.toLowerCase() < INR.toLowerCase() ? [AED, INR] : [INR, AED];
  const poolKey = [token0, token1, 3000, 60, ethers.ZeroAddress];
  
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint24', 'int24', 'address'],
      poolKey
    )
  );

  console.log('Pool ID:', poolId);

  // Check pool storage
  const poolManager = new ethers.Contract(
    POOL_MANAGER,
    ['function extsload(bytes32 slot) view returns (bytes32)'],
    signer
  );

  const slot = await poolManager.extsload(poolId);
  console.log('Pool storage:', slot);
  
  if (slot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.log('✅ POOL IS INITIALIZED!\n');
    
    // Now add liquidity using PoolModifyLiquidityTest
    const MODIFY_LIQUIDITY_TEST = '0x37429cd17cb1454c34e7f50b09725202fd533039';
    
    console.log('💰 Adding liquidity: 1000 AED + ~22,727 INR\n');
    
    // Check balances
    const aedToken = new ethers.Contract(AED, [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ], signer);
    
    const inrToken = new ethers.Contract(INR, [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ], signer);
    
    const aedBalance = await aedToken.balanceOf(signer.address);
    const inrBalance = await inrToken.balanceOf(signer.address);
    
    console.log('Available:');
    console.log('  AED:', ethers.formatUnits(aedBalance, 6));
    console.log('  INR:', ethers.formatUnits(inrBalance, 6));
    
    const aedAmount = 1000n * 10n**6n; // 1000 AED
    const inrAmount = 22727n * 10n**6n; // 22,727 INR (1 AED = 22.727 INR)
    
    if (aedBalance < aedAmount) {
      console.log('❌ Insufficient AED balance');
      return;
    }
    if (inrBalance < inrAmount) {
      console.log('❌ Insufficient INR balance');
      return;
    }
    
    // Approve tokens
    console.log('\n📝 Approving tokens...');
    const approveTx1 = await aedToken.approve(MODIFY_LIQUIDITY_TEST, aedAmount);
    await approveTx1.wait();
    console.log('  ✅ AED approved');
    
    const approveTx2 = await inrToken.approve(MODIFY_LIQUIDITY_TEST, inrAmount);
    await approveTx2.wait();
    console.log('  ✅ INR approved');
    
    // Add liquidity
    const modifyLiquidityTest = new ethers.Contract(
      MODIFY_LIQUIDITY_TEST,
      [
        'function modifyLiquidity((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) payable returns (int256, int256)'
      ],
      signer
    );
    
    const liquidityParams = [
      -887220, // tickLower (full range)
      887220,  // tickUpper (full range)
      ethers.parseUnits('1000', 6), // liquidity delta (simplified)
      ethers.ZeroHash // salt
    ];
    
    console.log('\n📤 Adding liquidity...');
    const tx = await modifyLiquidityTest.modifyLiquidity(
      poolKey,
      liquidityParams,
      '0x',
      { gasLimit: 500000 }
    );
    
    console.log('Transaction:', tx.hash);
    console.log('🔗 https://sepolia.basescan.org/tx/' + tx.hash);
    
    const receipt = await tx.wait();
    console.log('\n✅ LIQUIDITY ADDED!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    console.log('\n🎉 Pool is now fully operational!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your frontend (http://localhost:3000)');
    console.log('   2. V4 quotes should now show: 1 INR ≈ 0.044 AED');
    console.log('   3. Try a swap!');
    
  } else {
    console.log('❌ Pool still not initialized');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
