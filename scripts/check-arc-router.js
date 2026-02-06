const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Check balances in the old router on Arc Testnet
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("💰 Check Router Balances on Arc Testnet");
    console.log("========================================\n");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);
    console.log("Signer:", signer.address);
    console.log();

    const OLD_LIFI_ROUTER = '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194';
    
    console.log(`📍 Router Address: ${OLD_LIFI_ROUTER}\n`);

    // On Arc, we need to find the token addresses
    // Let's check if tokens exist at common addresses
    console.log("🔍 Searching for token contracts...\n");

    // Try to get code at the router address
    const code = await ethers.provider.getCode(OLD_LIFI_ROUTER);
    if (code === '0x') {
        console.log("⚠️  No contract found at this address on Arc Testnet!");
        console.log("This means the router only exists on Sepolia.\n");
        console.log("Checking native balance instead...");
        
        const balance = await ethers.provider.getBalance(OLD_LIFI_ROUTER);
        console.log(`Native token balance: ${ethers.formatEther(balance)} ETH`);
        
        return;
    }

    console.log("✅ Contract exists on Arc!\n");

    // Since we don't have Arc deployment info, let's try to interact with the router
    try {
        const LIFIRouter = await ethers.getContractFactory("LIFIRouter");
        const router = LIFIRouter.attach(OLD_LIFI_ROUTER);
        
        const zapCount = await router.zapCount();
        console.log(`Zap Count: ${zapCount}\n`);
        
        if (zapCount > 0) {
            const zapIndex = zapCount - 1n;
            const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
            const zapId = ethers.keccak256(
                ethers.solidityPacked(["uint256", "uint256"], [chainId, zapIndex])
            );
            
            console.log(`Zap ID: ${zapId}\n`);
            
            const zapDetails = await router.pendingZaps(zapId);
            console.log("💰 Zap Details:");
            console.log("─".repeat(80));
            console.log(`Recipient:        ${zapDetails.recipient}`);
            console.log(`Token In:         ${zapDetails.tokenIn}`);
            console.log(`Token Out:        ${zapDetails.tokenOut}`);
            console.log(`Amount In:        ${ethers.formatUnits(zapDetails.amountIn, 6)}`);
            console.log(`Min Amount Out:   ${ethers.formatUnits(zapDetails.minAmountOut, 6)}`);
            console.log(`Destination Chain: ${zapDetails.destinationChainId}`);
            console.log("─".repeat(80));
            
            // Check token balances
            if (zapDetails.tokenIn !== ethers.ZeroAddress) {
                const tokenIn = await ethers.getContractAt("MockERC20", zapDetails.tokenIn);
                const balance = await tokenIn.balanceOf(OLD_LIFI_ROUTER);
                const symbol = await tokenIn.symbol();
                console.log(`\nRouter ${symbol} balance: ${ethers.formatUnits(balance, 6)}`);
            }
        }
        
    } catch (error) {
        console.error("Error querying router:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
