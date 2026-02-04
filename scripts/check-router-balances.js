const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Check balances in the old router and transfer tokens
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("💰 Check Router Balances and Transfer");
    console.log("======================================\n");
    console.log("Network:", hre.network.name);
    console.log("Signer:", signer.address);
    console.log();

    const OLD_LIFI_ROUTER = '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194';
    
    const CONTRACTS = {
        sepolia: {
            INR_STABLE: '0x39938F6265CCb3A4C0d57D7A134d6319B9f5ae88',
            AED_STABLE: '0x40EA87a1a2d0874F3F8E6C18d66F7562Ae5A18d0',
        }
    };

    const config = CONTRACTS[hre.network.name];

    console.log(`📍 Router Address: ${OLD_LIFI_ROUTER}\n`);

    // Check balances
    const INR = await ethers.getContractAt("MockERC20", config.INR_STABLE);
    const AED = await ethers.getContractAt("MockERC20", config.AED_STABLE);
    
    const inrBalance = await INR.balanceOf(OLD_LIFI_ROUTER);
    const aedBalance = await AED.balanceOf(OLD_LIFI_ROUTER);
    
    console.log("📊 Token Balances in Router:");
    console.log("─".repeat(80));
    console.log(`INR: ${ethers.formatEther(inrBalance)}`);
    console.log(`AED: ${ethers.formatEther(aedBalance)}`);
    console.log("─".repeat(80));
    console.log();

    if (inrBalance === 0n && aedBalance === 0n) {
        console.log("✅ No tokens stuck in router. All clear!");
        return;
    }

    // Tokens are stuck! Need to rescue them
    console.log("⚠️  TOKENS ARE STUCK IN THE ROUTER!\n");
    console.log("To complete the settlement, please provide:");
    console.log("1. Recipient wallet address");
    console.log("2. Which token to send (INR or AED)");
    console.log("3. Amount to send\n");
    
    // For now, let's try to check if the router has any rescue functions
    const routerContract = await ethers.getContractAt("LIFIRouter", OLD_LIFI_ROUTER);
    
    // Try to get the owner
    try {
        const owner = await routerContract.owner();
        console.log(`Router Owner: ${owner}`);
        console.log(`Your Address: ${signer.address}`);
        
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
            console.log("\n✅ You are the owner! You can rescue the tokens.\n");
            
            // Assuming you want to send all stuck tokens
            // Ask user for recipient
            console.log("To rescue tokens, run this script with recipient address as argument:");
            console.log("Example: RECIPIENT=0xYourAddress npx hardhat run scripts/rescue-tokens.js --network sepolia");
        } else {
            console.log("\n⚠️  You are not the owner. Only the owner can rescue stuck tokens.");
        }
    } catch (e) {
        console.log("Could not fetch owner info");
    }
    
    // Try to see if there's a rescueTokens function
    try {
        console.log("\n🔍 Checking for rescue functions...");
        
        // Try to call rescueTokens if it exists
        const hasRescue = await routerContract.rescueTokens;
        if (hasRescue) {
            console.log("✅ Router has rescueTokens function!");
        }
    } catch (e) {
        console.log("Router may not have a rescue function.");
        console.log("\n💡 Alternative: If you own the router, you can:");
        console.log("1. Deploy a new router");
        console.log("2. Update the frontend to use the new router");
        console.log("3. Manually mint tokens to the recipient to compensate");
    }
    
    console.log("\n📝 MANUAL SETTLEMENT OPTION:");
    console.log("─".repeat(80));
    console.log("Since the zap details are lost, you can manually mint tokens");
    console.log("to the recipient. You need to know:");
    console.log("- Recipient address");
    console.log("- Amount they should receive");
    console.log("- Which token (INR or AED)");
    console.log();
    console.log("Then run the emergency settlement script with those details.");
    console.log("─".repeat(80));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
