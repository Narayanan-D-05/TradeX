const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("💰 Base Sepolia Balance Check\n");
    console.log("Address:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    const ethBalance = ethers.formatEther(balance);
    
    console.log("Balance:", ethBalance, "ETH");
    console.log("Wei:", balance.toString());
    
    if (balance === 0n) {
        console.log("\n❌ No balance!");
        console.log("\n💡 Get Base Sepolia ETH from:");
        console.log("   • https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
        console.log("   • https://faucet.quicknode.com/base/sepolia");
        console.log("   • Bridge from Sepolia: https://bridge.base.org");
    } else if (balance < ethers.parseEther("0.01")) {
        console.log("\n⚠️  Low balance (< 0.01 ETH)");
        console.log("   Recommended: At least 0.01 ETH for deployments");
    } else {
        console.log("\n✅ Sufficient balance for deployments!");
    }
    
    console.log("\n🔍 View on BaseScan:");
    console.log(`   https://sepolia.basescan.org/address/${deployer.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
