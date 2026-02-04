const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Manual Settlement Script
 * 
 * Use this to manually settle a specific zap transaction.
 * This is useful for testing or recovering from failed automatic settlements.
 * 
 * Usage:
 *   npx hardhat run scripts/manual-settle.js --network sepolia
 *   (or --network arc)
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("🔧 Manual Cross-Chain Settlement");
    console.log("=================================\n");
    console.log("Network:", hre.network.name);
    console.log("Signer:", signer.address);
    console.log();

    // Contract addresses - update these with your deployments
    const CONTRACTS = {
        LIFI_ROUTER: '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194',
        INR_STABLE: '0x228afECAb39932F0A83EfA03DBAd1dc20E954B7f',
        AED_STABLE: '0x9CE41E2fBCe064734883c7789726Dcc9e358569C',
    };

    // Get the LIFIRouter contract
    const LIFIRouter = await ethers.getContractFactory("LIFIRouter");
    const lifiRouter = LIFIRouter.attach(CONTRACTS.LIFI_ROUTER);

    // Get all past ZapInitiated events
    console.log("📡 Fetching recent zap events...\n");

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10); // Look back 10 blocks (free tier limit)

    const filter = lifiRouter.filters.ZapInitiated();
    let events = [];
    
    // Try to get events, if fails, get from latest block only
    try {
        events = await lifiRouter.queryFilter(filter, fromBlock, currentBlock);
    } catch (e) {
        console.log("⚠️  Block range too large, fetching from latest block only...\n");
        events = await lifiRouter.queryFilter(filter, currentBlock, currentBlock);
    }

    console.log(`Found ${events.length} zap events in the last ${currentBlock - fromBlock} blocks\n`);

    if (events.length === 0) {
        console.log("No zap events found. Exiting...");
        return;
    }

    // Display all events
    console.log("📋 Recent Zap Transactions:");
    console.log("─".repeat(80));

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const zapId = event.args.zapId;
        const sender = event.args.sender;
        const amountIn = event.args.amountIn;
        const destinationChainId = event.args.destinationChainId;

        console.log(`${i + 1}. Zap ID: ${zapId}`);
        console.log(`   Sender: ${sender}`);
        console.log(`   Amount: ${ethers.formatEther(amountIn)}`);
        console.log(`   Destination Chain: ${destinationChainId}`);
        console.log(`   Block: ${event.blockNumber}`);

        // Get zap details
        try {
            const zapDetails = await lifiRouter.pendingZaps(zapId);
            console.log(`   Recipient: ${zapDetails.recipient}`);
            console.log(`   Output Amount: ${ethers.formatEther(zapDetails.minAmountOut)}`);
            console.log(`   Token Out: ${zapDetails.tokenOut}`);
        } catch (e) {
            console.log(`   (Could not fetch zap details)`);
        }
        console.log();
    }

    console.log("─".repeat(80));
    console.log("\n💡 To settle a zap, you need to:");
    console.log("1. Note the ZapID, Recipient, and Output Amount");
    console.log("2. Switch to the DESTINATION chain");
    console.log("3. Mint the output token to the recipient\n");

    // Example settlement for the most recent zap
    if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        const zapId = latestEvent.args.zapId;

        try {
            const zapDetails = await lifiRouter.pendingZaps(zapId);
            const recipient = zapDetails.recipient;
            const amountOut = zapDetails.minAmountOut;
            const tokenOut = zapDetails.tokenOut;

            console.log("🎯 Settling most recent zap:");
            console.log(`   Zap ID: ${zapId}`);
            console.log(`   Recipient: ${recipient}`);
            console.log(`   Token: ${tokenOut}`);
            console.log(`   Amount: ${ethers.formatEther(amountOut)}`);
            console.log();

            // Determine which token to mint based on network
            let tokenAddress;
            if (hre.network.name === 'sepolia') {
                tokenAddress = CONTRACTS.INR_STABLE;
                console.log("   Minting INR on Sepolia...");
            } else if (hre.network.name === 'arc') {
                tokenAddress = CONTRACTS.AED_STABLE;
                console.log("   Minting AED on Arc...");
            } else {
                console.log("   ⚠️  Unknown network, skipping automatic settlement");
                return;
            }

            // Get the token contract
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const token = MockERC20.attach(tokenAddress);

            // Mint tokens to recipient
            console.log("   Sending mint transaction...");
            const tx = await token.mint(recipient, amountOut);
            console.log(`   TX Hash: ${tx.hash}`);

            console.log("   Waiting for confirmation...");
            const receipt = await tx.wait();

            console.log(`\n   ✅ Settlement complete!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`\n   The recipient should now see ${ethers.formatEther(amountOut)} tokens in their wallet!`);

        } catch (error) {
            console.error("\n❌ Settlement failed:", error.message);
            console.log("\nPossible reasons:");
            console.log("- You're on the wrong network");
            console.log("- Token contract doesn't have public mint function");
            console.log("- Recipient address is invalid");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
