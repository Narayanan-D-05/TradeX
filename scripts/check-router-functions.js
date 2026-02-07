const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Checking Alternative Router Functions\n');

  const ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';

  const provider = ethers.provider;
  
  // Get bytecode to verify contract exists
  const code = await provider.getCode(ROUTER);
  console.log('Router bytecode size:', code.length, 'bytes');
  
  if (code === '0x') {
    console.log('❌ No contract at this address!');
    return;
  }

  // Try common V4 swap functions
  const commonFunctions = [
    'function swap((address,address,uint24,int24,address),bool,int256,uint160,bytes) external returns (int256,int256)',
    'function swap((address,address,uint24,int24,address),(address,bool,int256,uint160,uint256,uint256,address,bytes)) external payable returns (int256,int256)',
    'function swapExactInputSingle((address,address,uint24,int24,address),address,address,uint256,uint256,uint160) external returns (uint256)',
    'function exactInputSingle((address,address,uint24,int24,address),address,address,uint256) external returns (uint256)',
    'function execute(bytes) external payable',
    'function execute(bytes[]) external payable',
    'function modifyLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes) external payable',
    'function addLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes) external payable',
    'function getPoolStatus((address,address,uint24,int24,address)) view returns (uint160,uint128)'
  ];

  console.log('\n📋 Testing common V4 router functions:\n');

  for (const func of commonFunctions) {
    try {
      const iface = new ethers.Interface([func]);
      const router = new ethers.Contract(ROUTER, [func], provider);
      const funcName = func.split('(')[0].replace('function ', '');
      
      // Try to encode a call to see if function exists
      try {
        const selector = iface.getFunction(funcName).selector;
        console.log(`✅ ${funcName} - Selector: ${selector}`);
      } catch (e) {
        console.log(`❓ ${funcName} - Could not get selector`);
      }
    } catch (e) {
      // Function likely doesn't exist or interface is wrong
    }
  }

  // Try to call getPoolStatus to verify it works
  console.log('\n🧪 Testing getPoolStatus (known to work):\n');
  
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

  const router = new ethers.Contract(
    ROUTER,
    ['function getPoolStatus((address,address,uint24,int24,address)) view returns (uint160,uint128)'],
    provider
  );

  try {
    const status = await router.getPoolStatus(poolKey);
    console.log('✅ getPoolStatus works:');
    console.log('   sqrtPriceX96:', status[0].toString());
    console.log('   liquidity:', status[1].toString());
  } catch (e) {
    console.log('❌ getPoolStatus failed:', e.message);
  }

  console.log('\n📝 CONCLUSION:');
  console.log('   The alternative router appears to be a SIMPLE test router');
  console.log('   It has liquidity management (addLiquidity, getPoolStatus)');
  console.log('   But may NOT have exposed swap functions for public use');
  console.log();
  console.log('💡 OPTIONS:');
  console.log('   1. Interact directly with PoolManager.swap() via unlock()');
  console.log('   2. Use PoolManager.lock() callback pattern');
  console.log('   3. Deploy a custom swap router contract');
  console.log('   4. Keep using Yellow Network for swaps (already working!)');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
