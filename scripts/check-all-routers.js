const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Check all router addresses for stuck tokens
 */

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("🔍 Comprehensive Router Check");
    console.log("============================\n");
    console.log("Network:", hre.network.name);
    console.log("Signer:", signer.address);
    console.log();

    const ROUTERS_TO_CHECK = [
        {
            name: "Old Router (from scripts)",
            address: '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194',
        },
        {
            name: "Current Router (sepolia-deployment.json)",
            address: '0x2128B9003A26e6aE03ceB573Adc88Aea49D66069',
        }
    ];

    const TOKENS = {
        INR_STABLE: '0x39938F6265CCb3A4C0d57D7A134d6319B9f5ae88',
        AED_STABLE: '0x40EA87a1a2d0874F3F8E6C18d66F7562Ae5A18d0',
        USDC: '0xF0948735ea52d7BBD2cB83594E0Fe586c6bA84b1',
    };

    for (const router of ROUTERS_TO_CHECK) {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`📍 ${router.name}`);
        console.log(`   Address: ${router.address}`);
        console.log("─".repeat(80));

        // Check if contract exists
        const code = await ethers.provider.getCode(router.address);
        if (code === '0x') {
            console.log("   ⚠️  No contract at this address");
            continue;
        }

        console.log("   ✅ Contract exists\n");

        // Check token balances
        for (const [name, address] of Object.entries(TOKENS)) {
            try {
                const token = await ethers.getContractAt("MockERC20", address);
                const balance = await token.balanceOf(router.address);
                const symbol = await token.symbol();
                
                if (balance > 0) {
                    console.log(`   💰 ${symbol}: ${ethers.formatEther(balance)} ⚠️ STUCK`);
                } else {
                    console.log(`   ✅ ${symbol}: ${ethers.formatEther(balance)}`);
                }
            } catch (e) {
                console.log(`   ❌ ${name}: Error checking balance`);
            }
        }

        // Try to check zap count
        try {
            const LIFIRouter = await ethers.getContractFactory("LIFIRouter");
            const routerContract = LIFIRouter.attach(router.address);
            
            const zapCount = await routerContract.zapCount();
            console.log(`\n   📊 Zap Count: ${zapCount}`);

            if (zapCount > 0) {
                console.log(`\n   📋 Recent Zaps:`);
                
                // Check last few zaps
                for (let i = Math.max(0, Number(zapCount) - 3); i < Number(zapCount); i++) {
                    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
                    const zapId = ethers.keccak256(
                        ethers.solidityPacked(["uint256", "uint256"], [chainId, BigInt(i)])
                    );
                    
                    try {
                        const zapDetails = await routerContract.pendingZaps(zapId);
                        
                        if (zapDetails.recipient !== ethers.ZeroAddress) {
                            console.log(`\n   Zap #${i}:`);
                            console.log(`   - Recipient: ${zapDetails.recipient}`);
                            console.log(`   - Amount In: ${ethers.formatEther(zapDetails.amountIn)}`);
                            console.log(`   - Amount Out: ${ethers.formatEther(zapDetails.minAmountOut)}`);
                            console.log(`   - Token Out: ${zapDetails.tokenOut}`);
                            console.log(`   - Dest Chain: ${zapDetails.destinationChainId}`);
                        }
                    } catch (e) {
                        // Zap might be cleared
                    }
                }
            }
        } catch (e) {
            console.log(`\n   ℹ️  Could not read zap data: ${e.message}`);
        }
    }

    console.log(`\n${"=".repeat(80)}\n`);
    
    console.log("💡 Summary:");
    console.log("If you see tokens STUCK in any router, you need to:");
    console.log("1. Identify the recipient address");
    console.log("2. Mint the appropriate token to the recipient");
    console.log("3. Or use a rescue function if available");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
