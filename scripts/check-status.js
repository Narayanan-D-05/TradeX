const hre = require("hardhat");

/**
 * View Transaction Details
 * Quick script to check the status of zap transactions
 */

async function main() {
    console.log("🔍 Checking TradeX Transaction Status");
    console.log("=====================================\n");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);
    console.log();

    const LIFI_ROUTER = '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194';

    // Simple ABI for the functions we need
    const abi = [
        "event ZapInitiated(bytes32 indexed zapId, address indexed sender, address tokenIn, uint256 amountIn, uint256 destinationChainId)",
        "function pendingZaps(bytes32) view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 destinationChainId, address recipient, bytes lifiData)",
        "function zapCount() view returns (uint256)"
    ];

    const lifiRouter = await hre.ethers.getContractAt(abi, LIFI_ROUTER);

    try {
        const zapCount = await lifiRouter.zapCount();
        console.log(`📊 Total Zaps Created: ${zapCount.toString()}\n`);
    } catch (e) {
        console.log("Could not fetch zap count\n");
    }

    console.log("📡 Fetching recent ZapInitiated events...\n");

    try {
        const currentBlock = await hre.ethers.provider.getBlockNumber();
        console.log(`Current block: ${currentBlock}`);

        // Look back further - 50k blocks
        const fromBlock = Math.max(0, currentBlock - 50000);
        console.log(`Searching from block ${fromBlock} to ${currentBlock}\n`);

        const filter = lifiRouter.filters.ZapInitiated();
        const events = await lifiRouter.queryFilter(filter, fromBlock, currentBlock);

        console.log(`✅ Found ${events.length} zap transaction(s)\n`);
        console.log("=".repeat(80));

        if (events.length === 0) {
            console.log("\n⚠️  No zap transactions found on this network.");
            console.log("This could mean:");
            console.log("  1. Your transaction was on a different network (try --network arc)");
            console.log("  2. The transaction is older than 50,000 blocks");
            console.log("  3. The contract address is different\n");
            return;
        }

        // Display each event
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            console.log(`\n📦 Transaction #${i + 1}`);
            console.log("-".repeat(80));
            console.log(`Zap ID:          ${event.args.zapId}`);
            console.log(`Sender:          ${event.args.sender}`);
            console.log(`Token In:        ${event.args.tokenIn}`);
            console.log(`Amount In:       ${hre.ethers.formatUnits(event.args.amountIn, 6)}`);
            console.log(`Dest Chain:      ${event.args.destinationChainId}`);
            console.log(`Block:           ${event.blockNumber}`);
            console.log(`TX Hash:         ${event.transactionHash}`);

            // Try to get pending zap details
            try {
                const zapDetails = await lifiRouter.pendingZaps(event.args.zapId);
                console.log(`\n💰 Settlement Details:`);
                console.log(`Recipient:       ${zapDetails.recipient}`);
                console.log(`Token Out:       ${zapDetails.tokenOut}`);
                console.log(`Min Amount Out:  ${hre.ethers.formatUnits(zapDetails.minAmountOut, 6)}`);

                // Determine what needs to happen
                const destChainId = Number(zapDetails.destinationChainId);
                if (destChainId === 5042002) {
                    console.log(`\n🎯 ACTION NEEDED:`);
                    console.log(`   Run this on ARC network to settle:`);
                    console.log(`   npx hardhat run scripts/settle-specific.js --network arc`);
                } else if (destChainId === 11155111) {
                    console.log(`\n🎯 ACTION NEEDED:`);
                    console.log(`   Run this on SEPOLIA network to settle:`);
                    console.log(`   npx hardhat run scripts/settle-specific.js --network sepolia`);
                }
            } catch (e) {
                console.log(`\n⚠️  Could not fetch settlement details: ${e.message}`);
            }
        }

        console.log("\n" + "=".repeat(80));
        console.log("\n📝 Summary:");
        console.log(`Found ${events.length} cross-chain swap(s) on ${hre.network.name}`);
        console.log(`\nTo receive tokens, the settlement must happen on the DESTINATION chain.`);
        console.log(`Make sure you're running the settlement script on the correct network!\n`);

    } catch (error) {
        console.error("\n❌ Error fetching events:", error.message);
        console.log("\nTroubleshooting:");
        console.log("- Check that the contract address is correct");
        console.log("- Verify you're connected to the right RPC");
        console.log("- Try a different block range\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
