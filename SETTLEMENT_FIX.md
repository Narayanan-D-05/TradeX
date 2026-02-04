# Cross-Chain Settlement Fix for TradeX

## Problem

The LIFI Router contract at `0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194` is holding the transacted tokens because the cross-chain settlement is not happening automatically. 

### What's Happening:
1. **Fund Broker (INR → AED)**: When you send INR from Sepolia, the router takes your INR but the AED tokens need to be minted on Arc Testnet for the recipient
2. **Send Home (AED → INR)**: When you send AED from Arc, the router takes your AED but the INR tokens need to be minted on Sepolia for the recipient

### Why:
This is a cross-chain operation that requires a **relayer or settlement service** to watch events on one chain and mint tokens on the other chain. In production, this would be handled by LI.FI's bridge infrastructure.

## Solution

We've created two settlement scripts to fix this:

### 1. Automatic Settlement Service (`settle-cross-chain.js`)

This script runs continuously and automatically settles cross-chain swaps:

```bash
# Install dependencies first
npm install

# Run the settlement service
node scripts/settle-cross-chain.js
```

**What it does:**
- Listens to `ZapInitiated` events on both Sepolia and Arc
- When a zap is detected on Sepolia → mints AED on Arc for the recipient
- When a zap is detected on Arc → mints INR on Sepolia for the recipient
- Runs continuously until you stop it (Ctrl+C)

### 2. Manual Settlement Script (`manual-settle.js`)

For settling specific past transactions:

```bash
# Settle zaps from Sepolia (to mint INR on Sepolia for Arc→Sepolia swaps)
npx hardhat run scripts/manual-settle.js --network sepolia

# Settle zaps from Arc (to mint AED on Arc for Sepolia→Arc swaps)  
npx hardhat run scripts/manual-settle.js --network arc
```

**What it does:**
- Shows all recent zap transactions
- Automatically settles the most recent one
- Mints the output tokens to the recipient on the destination chain

## Quick Fix for Your Current Issue

Your transaction is stuck because the recipient hasn't received their tokens on the destination chain. Here's how to fix it:

### Step 1: Check which direction your swap went

- **If you did Fund Broker (INR → AED)**: The recipient needs AED on **Arc Testnet**
- **If you did Send Home (AED → INR)**: The recipient needs INR on **Sepolia**

### Step 2: Run the manual settlement script on the DESTINATION chain

For **Fund Broker** (INR → AED):
```bash
# Switch to Arc network and mint AED to recipient
npx hardhat run scripts/manual-settle.js --network arc
```

For **Send Home** (AED → INR):
```bash
# Switch to Sepolia network and mint INR to recipient
npx hardhat run scripts/manual-settle.js --network sepolia
```

### Step 3: Verify the settlement

The script will show you:
- The ZapID of the transaction
- The recipient address
- The amount being settled
- The transaction hash of the settlement

After running, the recipient should see the tokens in their wallet on the destination chain!

## For Future Swaps

To ensure all future swaps settle automatically:

1. **Keep the automatic settlement service running:**
   ```bash
   node scripts/settle-cross-chain.js
   ```

2. **Or use PM2 to run it as a background service:**
   ```bash
   npm install -g pm2
   pm2 start scripts/settle-cross-chain.js --name tradex-settler
   pm2 save
   pm2 startup
   ```

## Environment Setup

Make sure your `.env` file has:

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ARC_RPC_URL=https://rpc-testnet.arcnetwork.io
```

The private key should be for an account that has permission to mint tokens (typically the deployer account).

## Architecture Note

In production, this settlement would be handled by:
- **LI.FI's bridge infrastructure** for real cross-chain swaps
- **Chainlink CCIP** or **LayerZero** for message passing
- **Gelato** or **Chainlink Automation** for automated settlement

For the hackathon demo, we're simulating this with a simple event listener and minting service.

## Troubleshooting

### "Zap not found" or "No events"
- Make sure you're querying the correct network
- The transaction might be too old (script looks back 10k blocks by default)
- Check the contract address in the script matches your deployment

### "Mint failed" 
- Ensure your account (PRIVATE_KEY) has permission to mint tokens
- Verify you're on the correct destination network
- Check that the token contract has a public `mint(address, uint256)` function

### Recipient still doesn't see tokens
- Verify the settlement transaction was successful
- Check the recipient is looking at the correct network (Arc vs Sepolia)
- Make sure the recipient has added the token contract to their wallet

## Need Help?

Check the console output for detailed logs. The scripts show:
- ✅ for successful operations
- ❌ for errors with detailed messages
- Transaction hashes for verification on Etherscan/block explorers
