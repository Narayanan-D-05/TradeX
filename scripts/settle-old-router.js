const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Settlement Script for OLD Router
 * Address: 0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("🔧 Settlement for OLD LIFI Router");
    console.log("=================================\n");
    console.log("Network:", hre.network.name);
    console.log("Signer:", signer.address);
    console.log();

    // OLD Router address holding your funds
    const OLD_LIFI_ROUTER = '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194';
    
    // Token addresses from your deployment
    const CONTRACTS = {
        sepolia: {
            INR_STABLE: '0x39938F6265CCb3A4C0d57D7A134d6319B9f5ae88',
            AED_STABLE: '0x40EA87a1a2d0874F3F8E6C18d66F7562Ae5A18d0',
        }
    };

    const config = CONTRACTS[hre.network.name];
    if (!config) {
        console.error(`❌ Network ${hre.network.name} not configured`);
        return;
    }

    console.log(`📍 Old Router Address: ${OLD_LIFI_ROUTER}\n`);

    // Get the LIFIRouter contract
    const LIFIRouter = await ethers.getContractFactory("LIFIRouter");
    const lifiRouter = LIFIRouter.attach(OLD_LIFI_ROUTER);

    // Check zapCount
    try {
        console.log("📊 Checking zap count on old router...");
        const zapCount = await lifiRouter.zapCount();
        console.log(`Total zaps: ${zapCount}\n`);

        if (zapCount == 0) {
            console.log("No zaps found on old router.");
            console.log("\n💡 Let me check token balances in the router...\n");
            
            // Check INR balance
            const INR = await ethers.getContractAt("MockERC20", config.INR_STABLE);
            const inrBalance = await INR.balanceOf(OLD_LIFI_ROUTER);
            console.log(`INR Balance in Router: ${ethers.formatEther(inrBalance)}`);
            
            // Check AED balance
            const AED = await ethers.getContractAt("MockERC20", config.AED_STABLE);
            const aedBalance = await AED.balanceOf(OLD_LIFI_ROUTER);
            console.log(`AED Balance in Router: ${ethers.formatEther(aedBalance)}`);
            
            console.log("\n⚠️  If there are tokens stuck in the router, we need to:");
            console.log("1. Know the recipient address");
            console.log("2. Know which token (INR or AED)");
            console.log("3. Know the amount");
            console.log("\nPlease provide:");
            console.log("- Recipient wallet address");
            console.log("- Which currency (INR or AED)");
            console.log("- Expected amount");
            
            return;
        }

        // If there are zaps, try to settle the latest one
        const zapIndex = zapCount - 1n;
        const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
        const zapId = ethers.keccak256(
            ethers.solidityPacked(["uint256", "uint256"], [chainId, zapIndex])
        );

        console.log("📦 Latest Zap:");
        console.log(`Zap Index: ${zapIndex}`);
        console.log(`Zap ID: ${zapId}\n`);

        const zapDetails = await lifiRouter.pendingZaps(zapId);
        
        console.log("💰 Zap Details:");
        console.log("─".repeat(80));
        console.log(`Recipient:        ${zapDetails.recipient}`);
        console.log(`Token Out:        ${zapDetails.tokenOut}`);
        console.log(`Min Amount Out:   ${ethers.formatEther(zapDetails.minAmountOut)}`);
        console.log(`Destination Chain: ${zapDetails.destinationChainId}`);
        console.log("─".repeat(80));
        console.log();

        const recipient = zapDetails.recipient;
        const amountOut = zapDetails.minAmountOut;

        // Determine which token to mint
        let tokenAddress, tokenName;
        
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

        // Get the token contract and mint
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const token = MockERC20.attach(tokenAddress);

        console.log("Sending transaction...");
        const tx = await token.mint(recipient, amountOut);
        console.log(`TX Hash: ${tx.hash}`);

        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log(`\n✅ Settlement Complete!`);
        console.log("─".repeat(80));
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`\n🎉 The recipient should now see ${ethers.formatEther(amountOut)} ${tokenName}!`);
        console.log("─".repeat(80));

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        
        if (error.message.includes("function selector was not recognized")) {
            console.log("\n⚠️  The old router contract may have a different interface.");
            console.log("Let me check the token balances instead...\n");
            
            try {
                // Check token balances
                const INR = await ethers.getContractAt("MockERC20", config.INR_STABLE);
                const inrBalance = await INR.balanceOf(OLD_LIFI_ROUTER);
                console.log(`INR Balance in Router: ${ethers.formatEther(inrBalance)}`);
                
                const AED = await ethers.getContractAt("MockERC20", config.AED_STABLE);
                const aedBalance = await AED.balanceOf(OLD_LIFI_ROUTER);
                console.log(`AED Balance in Router: ${ethers.formatEther(aedBalance)}`);
                
                if (inrBalance > 0 || aedBalance > 0) {
                    console.log("\n💡 There are tokens in the router!");
                    console.log("\nTo complete the settlement, I need:");
                    console.log("1. The recipient wallet address");
                    console.log("2. Which token should be sent (INR or AED)");
                    console.log("3. The amount to send");
                }
            } catch (e) {
                console.error("Could not check balances:", e.message);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
