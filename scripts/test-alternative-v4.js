const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 TESTING ALTERNATIVE V4 DEPLOYMENT\n');

  const NETWORKS = {
    'Ethereum Sepolia': {
      rpc: 'https://1rpc.io/sepolia',
      manager: '0xf448192241A9BBECd36371CD1f446de81A5399d2',
      router: '0x6127b25A12AB31dF2B58Fe9DfFCba595AB927eA3'
    },
    'Base Sepolia': {
      rpc: 'https://sepolia.base.org',
      manager: '0x1b832D5395A41446b508632466cf32c6C07D63c7',
      router: '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0'
    }
  };

  for (const [name, config] of Object.entries(NETWORKS)) {
    console.log(`\n🧪 Testing ${name}...`);
    const provider = new ethers.JsonRpcProvider(config.rpc);

    // Check if contracts exist
    const managerCode = await provider.getCode(config.manager);
    const routerCode = await provider.getCode(config.router);

    console.log(`  Manager (${config.manager}):`);
    console.log(`    Exists: ${managerCode.length > 2 ? '✅ Yes' : '❌ No'}`);
    console.log(`    Code size: ${managerCode.length} bytes`);

    console.log(`  Router (${config.router}):`);
    console.log(`    Exists: ${routerCode.length > 2 ? '✅ Yes' : '❌ No'}`);
    console.log(`    Code size: ${routerCode.length} bytes`);

    if (managerCode.length > 2 && routerCode.length > 2) {
      // Try to call getPoolStatus on router
      const router = new ethers.Contract(
        config.router,
        [
          'function getPoolStatus((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) view returns (uint160 sqrtPriceX96, uint128 liquidity)'
        ],
        provider
      );

      // Test with a dummy pool key
      const testKey = {
        currency0: '0x0000000000000000000000000000000000000001',
        currency1: '0x0000000000000000000000000000000000000002',
        fee: 3000,
        tickSpacing: 60,
        hooks: ethers.ZeroAddress
      };

      try {
        const status = await router.getPoolStatus(testKey);
        console.log(`  ✅ getPoolStatus() works!`);
        console.log(`     sqrtPriceX96: ${status.sqrtPriceX96.toString()}`);
        console.log(`     liquidity: ${status.liquidity.toString()}`);
      } catch (error) {
        console.log(`  ⚠️  getPoolStatus() call: ${error.message.slice(0, 60)}`);
      }
    }
  }

  console.log('\n✅ Contract verification complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
