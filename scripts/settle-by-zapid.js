const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Direct Settlement Script - Settle by ZapID
 * 
 * This script settles a specific zap transaction without needing to query events.
 * Use when you know the zapId or want to settle the most recent zap.
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("🔧 Direct Cross-Chain Settlement");
    console.log("=================================\n");
    console.log("Network:", hre.network.name);
    console.log("Signer:", signer.address);
    console.log();

    // Contract addresses from deployments
    const CONTRACTS = {
        sepolia: {
            LIFI_ROUTER: '0x2128B9003A26e6aE03ceB573Adc88Aea49D66069',
            INR_STABLE: '0x39938F6265CCb3A4C0d57D7A134d6319B9f5ae88',
            AED_STABLE: '0x40EA87a1a2d0874F3F8E6C18d66F7562Ae5A18d0',
        }
    };

    const config = CONTRACTS[hre.network.name];
    if (!config) {
        console.error(`❌ Network ${hre.network.name} not configured`);
        return;
    }

    // Get the LIFIRouter contract
    const LIFIRouter = await ethers.getContractFactory("LIFIRouter");
    const lifiRouter = LIFIRouter.attach(config.LIFI_ROUTER);

    // Get zapCount to find the latest zap
    console.log("📊 Fetching zap count...");
    const zapCount = await lifiRouter.zapCount();
    console.log(`Total zaps: ${zapCount}\n`);

    if (zapCount == 0) {
        console.log("No zaps found. Exiting...");
        return;
    }

    // Calculate the latest zapId (zapCount - 1 since it's 0-indexed)
    const zapIndex = zapCount - 1n;
    
    // ZapId is keccak256(abi.encodePacked(chainId, zapCount))
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    const zapId = ethers.keccak256(
        ethers.solidityPacked(["uint256", "uint256"], [chainId, zapIndex])
    );

    console.log("📦 Latest Zap Details:");
    console.log(`Zap Index: ${zapIndex}`);
    console.log(`Zap ID: ${zapId}\n`);

    // Get zap details
    try {
        const zapDetails = await lifiRouter.pendingZaps(zapId);
        
        console.log("💰 Zap Information:");
        console.log("─".repeat(80));
        console.log(`Token In:         ${zapDetails.tokenIn}`);
        console.log(`Token Out:        ${zapDetails.tokenOut}`);
        console.log(`Amount In:        ${ethers.formatEther(zapDetails.amountIn)}`);
        console.log(`Min Amount Out:   ${ethers.formatEther(zapDetails.minAmountOut)}`);
        console.log(`Destination Chain: ${zapDetails.destinationChainId}`);
        console.log(`Recipient:        ${zapDetails.recipient}`);
        console.log("─".repeat(80));
        console.log();

        // Determine settlement action based on network
        const recipient = zapDetails.recipient;
        const amountOut = zapDetails.minAmountOut;
        const destChainId = Number(zapDetails.destinationChainId);
        const currentChainId = Number(chainId);

        console.log("🎯 Settlement Analysis:");
        console.log(`Current Chain: ${currentChainId}`);
        console.log(`Destination Chain: ${destChainId}`);
        console.log();

        if (currentChainId === destChainId) {
            console.log("✅ You're on the DESTINATION chain!");
            console.log("Proceeding with settlement...\n");

            // Determine which token to mint
            let tokenAddress, tokenName;
            
            // Check which token matches the tokenOut
            if (zapDetails.tokenOut.toLowerCase() === config.INR_STABLE.toLowerCase()) {
                tokenAddress = config.INR_STABLE;
                tokenName = "INR";
            } else if (zapDetails.tokenOut.toLowerCase() === config.AED_STABLE.toLowerCase()) {
                tokenAddress = config.AED_STABLE;
                tokenName = "AED";
            } else {
                console.error("❌ Unknown output token:", zapDetails.tokenOut);
                return;
            }

            console.log(`💸 Minting ${ethers.formatEther(amountOut)} ${tokenName} to ${recipient}...`);

            // Get the token contract
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const token = MockERC20.attach(tokenAddress);

            // Check if we can mint
            console.log("Sending transaction...");
            const tx = await token.mint(recipient, amountOut);
            console.log(`TX Hash: ${tx.hash}`);

            console.log("Waiting for confirmation...");
            const receipt = await tx.wait();

            console.log(`\n✅ Settlement Complete!`);
            console.log("─".repeat(80));
            console.log(`Block: ${receipt.blockNumber}`);
            console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
            console.log(`\n🎉 Success! The recipient should now see ${ethers.formatEther(amountOut)} ${tokenName} at ${recipient}`);
            console.log("─".repeat(80));

        } else {
            console.log("⚠️  You're on the SOURCE chain, not the destination!");
            console.log(`Switch to chain ${destChainId} to complete settlement.`);
            console.log();
            
            if (destChainId === 11155111) {
                console.log("Run: npx hardhat run scripts/settle-by-zapid.js --network sepolia");
            } else if (destChainId === 1234567) {
                console.log("Run: npx hardhat run scripts/settle-by-zapid.js --network arc");
            }
        }

    } catch (error) {
        console.error("\n❌ Error fetching zap details:", error.message);
        console.log("\nPossible reasons:");
        console.log("- Zap doesn't exist or already settled");
        console.log("- Wrong network");
        console.log("- Contract address mismatch");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
