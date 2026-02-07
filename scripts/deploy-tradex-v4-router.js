const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying TradeXV4Router to Base Sepolia\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('ETH Balance:', ethers.formatEther(balance));

  // Alternative Uniswap V4 PoolManager on Base Sepolia (where our pool lives)
  const POOL_MANAGER = '0x1b832D5395A41446b508632466cf32c6C07D63c7';
  
  console.log('\nPoolManager:', POOL_MANAGER);

  // Deploy TradeXV4Router
  console.log('\n📦 Deploying TradeXV4Router...');
  const TradeXV4Router = await ethers.getContractFactory('TradeXV4Router');
  const router = await TradeXV4Router.deploy(POOL_MANAGER);
  await router.waitForDeployment();

  const routerAddress = await router.getAddress();
  console.log('\n✅ TradeXV4Router deployed!');
  console.log('   Address:', routerAddress);
  console.log('   🔗 https://sepolia.basescan.org/address/' + routerAddress);

  // Verify manager
  const managerAddr = await router.manager();
  console.log('   PoolManager:', managerAddr);

  console.log('\n📋 Next steps:');
  console.log('   1. Approve AED & INR tokens to this router');
  console.log('   2. Call router.swap() to execute V4 swaps');
  console.log('   3. Transaction hash returned on every swap!');
  console.log('\n🎉 TradeXV4Router ready for swaps!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
