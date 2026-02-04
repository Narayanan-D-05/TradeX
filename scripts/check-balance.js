const hre = require("hardhat");

async function main() {
    try {
        console.log("Network:", hre.network.name);
        console.log("Chain ID:", hre.network.config.chainId);

        const [signer] = await hre.ethers.getSigners();
        console.log("Signer address:", signer.address);

        const balance = await hre.ethers.provider.getBalance(signer.address);
        console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

        if (balance === 0n) {
            console.log("\n⚠️  No ETH balance! Please get Sepolia ETH from a faucet:");
            console.log("   https://sepoliafaucet.com");
            console.log("   https://faucet.quicknode.com/drip");
        } else {
            console.log("\n✅ Account is funded and ready to deploy!");
        }
    } catch (error) {
        console.error("Error:", error.message);
        if (error.message.includes("timeout")) {
            console.log("\n⚠️  RPC timeout. Try a different RPC provider.");
        }
    }
}

main();
