const hre = require("hardhat");
const { ethers } = require("ethers");

/**
 * Cross-Chain Settlement Script for TradeX
 * 
 * This script listens to ZapInitiated events on both chains and settles
 * the output tokens on the destination chain.
 * 
 * Flow:
 * 1. Listen to ZapInitiated events on Sepolia
 *    → Mint AED on Arc for the recipient
 * 2. Listen to ZapInitiated events on Arc  
 *    → Mint INR on Sepolia for the recipient
 */

// Contract addresses (update these with your deployed addresses)
const CONTRACTS = {
    LIFI_ROUTER_SEPOLIA: '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194',
    LIFI_ROUTER_ARC: '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194', // Should be different on Arc
    INR_STABLE_SEPOLIA: '0x228afECAb39932F0A83EfA03DBAd1dc20E954B7f',
    AED_STABLE_ARC: '0x9CE41E2fBCe064734883c7789726Dcc9e358569C',
};

// RPC URLs
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const ARC_RPC = process.env.ARC_RPC_URL || "https://rpc-testnet.arcnetwork.io";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in environment variables");
    process.exit(1);
}

// ABI definitions
const LIFI_ROUTER_ABI = [
    {
        name: 'ZapInitiated',
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'zapId', type: 'bytes32', indexed: true },
            { name: 'sender', type: 'address', indexed: true },
            { name: 'tokenIn', type: 'address', indexed: false },
            { name: 'amountIn', type: 'uint256', indexed: false },
            { name: 'destinationChainId', type: 'uint256', indexed: false }
        ]
    },
    {
        name: 'pendingZaps',
        type: 'function',
        inputs: [{ name: '', type: 'bytes32' }],
        outputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
            { name: 'destinationChainId', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'lifiData', type: 'bytes' }
        ],
        stateMutability: 'view'
    }
];

const ERC20_ABI = [
    {
        name: 'mint',
        type: 'function',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
    }
];

// Setup providers and signers
const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const arcProvider = new ethers.JsonRpcProvider(ARC_RPC);

const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);
const arcWallet = new ethers.Wallet(PRIVATE_KEY, arcProvider);

// Setup contract instances
const lifiRouterSepolia = new ethers.Contract(
    CONTRACTS.LIFI_ROUTER_SEPOLIA,
    LIFI_ROUTER_ABI,
    sepoliaProvider
);

const lifiRouterArc = new ethers.Contract(
    CONTRACTS.LIFI_ROUTER_ARC,
    LIFI_ROUTER_ABI,
    arcProvider
);

const inrStable = new ethers.Contract(
    CONTRACTS.INR_STABLE_SEPOLIA,
    ERC20_ABI,
    sepoliaWallet
);

const aedStable = new ethers.Contract(
    CONTRACTS.AED_STABLE_ARC,
    ERC20_ABI,
    arcWallet
);

// Settlement tracking
const settledZaps = new Set();

async function settleSepolia ToArc(zapId, eventData) {
    if (settledZaps.has(zapId)) {
        console.log(`⏭️  Zap ${zapId} already settled, skipping...`);
        return;
    }

    try {
        console.log(`\n🔄 Processing Sepolia → Arc zap: ${zapId}`);

        // Get zap details from contract
        const zapDetails = await lifiRouterSepolia.pendingZaps(zapId);
        const recipient = zapDetails.recipient;
        const amountOut = zapDetails.minAmountOut;

        console.log(`   Recipient: ${recipient}`);
        console.log(`   Amount: ${ethers.formatEther(amountOut)} AED`);

        // Mint AED tokens on Arc to the recipient
        console.log(`   Minting AED on Arc...`);
        const tx = await aedStable.mint(recipient, amountOut);
        console.log(`   TX Hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   ✅ Settled! Block: ${receipt.blockNumber}`);

        settledZaps.add(zapId);
    } catch (error) {
        console.error(`   ❌ Settlement failed:`, error.message);
    }
}

async function settleArcToSepolia(zapId, eventData) {
    if (settledZaps.has(zapId)) {
        console.log(`⏭️  Zap ${zapId} already settled, skipping...`);
        return;
    }

    try {
        console.log(`\n🔄 Processing Arc → Sepolia zap: ${zapId}`);

        // Get zap details from contract
        const zapDetails = await lifiRouterArc.pendingZaps(zapId);
        const recipient = zapDetails.recipient;
        const amountOut = zapDetails.minAmountOut;

        console.log(`   Recipient: ${recipient}`);
        console.log(`   Amount: ${ethers.formatEther(amountOut)} INR`);

        // Mint INR tokens on Sepolia to the recipient
        console.log(`   Minting INR on Sepolia...`);
        const tx = await inrStable.mint(recipient, amountOut);
        console.log(`   TX Hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   ✅ Settled! Block: ${receipt.blockNumber}`);

        settledZaps.add(zapId);
    } catch (error) {
        console.error(`   ❌ Settlement failed:`, error.message);
    }
}

async function main() {
    console.log("🌉 TradeX Cross-Chain Settlement Service");
    console.log("=========================================\n");
    console.log("📡 Listening for cross-chain zaps...\n");
    console.log("   Sepolia → Arc: INR → AED");
    console.log("   Arc → Sepolia: AED → INR\n");

    // Listen to Sepolia events (INR → AED)
    lifiRouterSepolia.on("ZapInitiated", async (zapId, sender, tokenIn, amountIn, destinationChainId, event) => {
        console.log(`\n🔔 New zap detected on Sepolia!`);
        console.log(`   Zap ID: ${zapId}`);
        console.log(`   Sender: ${sender}`);
        console.log(`   Amount In: ${ethers.formatEther(amountIn)} INR`);
        console.log(`   Destination: Chain ${destinationChainId}`);

        // Check if destination is Arc (chainId 5042002)
        if (destinationChainId.toString() === '5042002') {
            await settleSepoliaToArc(zapId, { sender, tokenIn, amountIn });
        }
    });

    // Listen to Arc events (AED → INR)
    lifiRouterArc.on("ZapInitiated", async (zapId, sender, tokenIn, amountIn, destinationChainId, event) => {
        console.log(`\n🔔 New zap detected on Arc!`);
        console.log(`   Zap ID: ${zapId}`);
        console.log(`   Sender: ${sender}`);
        console.log(`   Amount In: ${ethers.formatEther(amountIn)} AED`);
        console.log(`   Destination: Chain ${destinationChainId}`);

        // Check if destination is Sepolia (chainId 11155111)
        if (destinationChainId.toString() === '11155111') {
            await settleArcToSepolia(zapId, { sender, tokenIn, amountIn });
        }
    });

    console.log("✅ Settlement service is running...");
    console.log("   Press Ctrl+C to stop\n");

    // Keep the process running
    process.stdin.resume();
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log("\n\n👋 Shutting down settlement service...");
    process.exit(0);
});

main()
    .then(() => {
        // Keep running
    })
    .catch((error) => {
        console.error("❌ Settlement service error:", error);
        process.exit(1);
    });
