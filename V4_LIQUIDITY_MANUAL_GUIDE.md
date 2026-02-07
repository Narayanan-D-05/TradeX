# Step-by-Step Guide: Add Liquidity to Uniswap V4 Pool (Base Sepolia)

## 📋 Prerequisites

Before you start, make sure you have:
- ✅ MetaMask or another Web3 wallet installed
- ✅ The wallet address you used to deploy contracts
- ✅ Access to the same browser/wallet that deployed the contracts

## 🎯 Overview

You'll need to:
1. Add Base Sepolia network to your wallet
2. Get Base Sepolia ETH for gas
3. Get AED and INR test tokens on Base Sepolia
4. Add liquidity to the V4 pool

---

## Step 1: Add Base Sepolia Network to MetaMask

### Option A: Automatic (Recommended)

1. Visit: https://chainlist.org/
2. Search for "Base Sepolia"
3. Click "Add to MetaMask"
4. Approve the network addition in MetaMask

### Option B: Manual

1. Open MetaMask
2. Click the network dropdown (top left)
3. Click "Add Network" → "Add a network manually"
4. Enter these details:

```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

5. Click "Save"
6. Switch to Base Sepolia network

---

## Step 2: Get Base Sepolia ETH

You need ETH on Base Sepolia to pay for transactions.

### Method 1: Alchemy Faucet (Recommended)

1. Visit: https://www.alchemy.com/faucets/base-sepolia
2. Connect your wallet
3. Click "Send Me ETH"
4. Wait ~1 minute for ETH to arrive
5. Check your balance in MetaMask (should see 0.1 ETH)

### Method 2: Alternative Faucets

If Alchemy faucet doesn't work, try:

- **QuickNode**: https://faucet.quicknode.com/base/sepolia
- **Coinbase Wallet**: https://portal.cdp.coinbase.com/products/faucet

### Verify You Have ETH:

1. Switch MetaMask to "Base Sepolia" network
2. Your balance should show at least 0.05 ETH
3. If zero, wait a few minutes or try another faucet

---

## Step 3: Get AED and INR Tokens on Base Sepolia

You need both tokens to add liquidity.

### Contract Addresses (Base Sepolia):

```
AED Token: 0xd16B4e66c77048D68e6438068AfBBf4c96506d7F
INR Token: 0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a
```

### Method 1: Use Faucet Function (If Available)

If your tokens have a public faucet function:

1. Go to Base Sepolia Block Explorer: https://sepolia.basescan.org
2. Navigate to AED token: https://sepolia.basescan.org/address/0xd16B4e66c77048D68e6438068AfBBf4c96506d7F#writeContract
3. Click "Connect to Web3" button
4. Connect your MetaMask (make sure you're on Base Sepolia!)
5. Find the `faucet` or `mint` function
6. Click "Write" to get test tokens
7. Repeat for INR token: https://sepolia.basescan.org/address/0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a#writeContract

### Method 2: Mint Using Hardhat Script

If you deployed the contracts, run this from your project directory:

```powershell
# Make sure you're in the TradeX project directory
cd C:\Users\dnara\Desktop\Projects\TradeX

# Create a mint script
npx hardhat run scripts/mint-base-sepolia-tokens.js --network baseSepolia
```

I'll create this script for you below.

### Method 3: Transfer from Deployer

If you're the deployer, you already have tokens! Just skip to Step 4.

---

## Step 4: Add Liquidity on Uniswap Interface

Now that you have ETH, AED, and INR on Base Sepolia, let's add liquidity!

### 4.1 Navigate to Uniswap

1. Go to: https://app.uniswap.org/
2. Make sure MetaMask is on **Base Sepolia** network
3. Click "Pool" tab in the top navigation

### 4.2 Create a New Position

1. Click "New Position" or "+ New Position" button
2. Select network: **Base Sepolia** (top right dropdown)

### 4.3 Select Token Pair

**For Token 0 (AED):**
1. Click "Select token" in first dropdown
2. Click "Import tokens" or paste address
3. Enter: `0xd16B4e66c77048D68e6438068AfBBf4c96506d7F`
4. Click "Import" (you'll see a warning about unknown tokens - that's OK)
5. Confirm import

**For Token 1 (INR):**
1. Click "Select token" in second dropdown
2. Click "Import tokens" or paste address
3. Enter: `0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a`
4. Click "Import"
5. Confirm import

### 4.4 Set Fee Tier

1. Select **0.3%** fee tier (this matches your pool initialization)
2. The fee tier MUST match the initialized pool (3000 = 0.3%)

### 4.5 Set Price Range

**Option A: Full Range (Recommended for Testing)**

1. Click "Full Range" button
2. This provides liquidity at all prices
3. Simpler for initial testing

**Option B: Custom Range**

1. Set Min Price: 20 INR per AED
2. Set Max Price: 25 INR per AED
3. This focuses liquidity around current rate (22.727)

### 4.6 Set Deposit Amounts

The pool rate is approximately 1 AED = 22.727 INR

**Recommended Amounts:**
- AED: 100 AED
- INR: 2,273 INR (automatically calculated)

You can also enter:
- AED: 10 AED
- INR: 227 INR (for smaller test)

The interface will auto-calculate the matching amount.

### 4.7 Approve Tokens

1. Click "Approve AED" button
2. MetaMask will popup → Click "Confirm"
3. Wait for transaction to confirm (~2-5 seconds)
4. Click "Approve INR" button
5. MetaMask will popup → Click "Confirm"
6. Wait for transaction to confirm

### 4.8 Add Liquidity

1. Click "Add" or "Preview" button
2. Review the details:
   - Token amounts
   - Fee tier (0.3%)
   - Price range
3. Click "Add Liquidity"
4. MetaMask will popup → Click "Confirm"
5. Wait for transaction to confirm
6. You'll see "Position Created Successfully!" ✅

### 4.9 Verify Your Position

1. You should see your new position in the "Pools" tab
2. Click on the position to see details:
   - Token amounts
   - Unclaimed fees (will be 0 initially)
   - Current liquidity
3. Your position ID and pool address will be shown

---

## Step 5: Verify Liquidity Was Added

### Check on BaseScan:

1. Go to: https://sepolia.basescan.org
2. Search for PoolManager: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`
3. Click "Events" tab
4. Look for `ModifyLiquidity` event with your address
5. This confirms liquidity was added successfully

### Test on TradeX Frontend:

1. Refresh your TradeX app: http://localhost:3000
2. The "Pool not initialized" warning should disappear
3. You should now see:
   - ✅ Uniswap V4 quote with exchange rate
   - Estimated output amount
   - No more liquidity errors

---

## 🎉 Success! What Now?

### You've successfully added liquidity to Uniswap V4! Now you can:

1. **Test Swaps**: Try swapping INR ↔ AED on your TradeX frontend
2. **Monitor Position**: Watch your liquidity position on Uniswap interface
3. **Earn Fees**: You'll earn 0.3% of all swap volume (very small on testnet)
4. **Remove Liquidity**: You can remove liquidity anytime from the Pools page

---

## 🆘 Troubleshooting

### Problem: "Pool doesn't exist" on Uniswap interface

**Solution**: The pool might not be auto-detected. You need to:
1. Check if pool was actually initialized (look for Initialize event on BaseScan)
2. Pool ID should be: `0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281`
3. If pool doesn't show up, you may need to use V4 PositionManager contract directly

### Problem: "Insufficient balance" when adding liquidity

**Solution**: 
1. Check you have enough AED and INR on **Base Sepolia** (not Ethereum Sepolia!)
2. Make sure you're on the correct network in MetaMask
3. Mint more tokens using the faucet or script

### Problem: Transaction keeps failing

**Solution**:
1. Increase gas limit (try 500,000)
2. Ensure you have at least 0.01 ETH on Base Sepolia
3. Check that fee tier is 0.3% (3000 in contract)
4. Verify token addresses are correct

### Problem: Can't import tokens in Uniswap interface

**Solution**:
1. Make sure you're on Base Sepolia network
2. Copy-paste addresses carefully (no spaces)
3. Accept the "unknown token" warning
4. tokens may not have metadata - that's OK for testing

### Problem: "Hook validation failed"

**Solution**:
1. Make sure hooks address is `0x0000000000000000000000000000000000000000`
2. Your pool was initialized without hooks, so liquidity must also use no hooks

---

## 📊 Expected Results

After adding liquidity, your TradeX app should show:

```
🦄 Uniswap V4 Live Price          Real-time
1 INR = 0.044022 AED

You'll receive: 4.40 AED
```

The "Pool not initialized" warning will be **gone**, and swaps will execute through V4!

---

## 💡 Alternative: Keep Using Yellow Network

Remember, you **don't have to** add V4 liquidity for a great demo!

### Yellow Network is Already Working:
- ✅ Gasless swaps
- ✅ Instant settlements
- ✅ 19 ytest.usd balance
- ✅ Perfect for remittance use case

### Demo Strategy:
1. **Primary**: Show Yellow Network gasless swaps (your killer feature)
2. **Secondary**: Mention V4 integration as "future expansion"
3. **Positioning**: "We support multiple liquidity sources - Yellow for gasless, V4 for DEX compatibility"

This way, you have a **working demo today** while showing technical ambition with V4!

---

## 📝 Quick Reference

### Addresses:
```
Network: Base Sepolia (Chain ID: 84532)
PoolManager: 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
AED Token: 0xd16B4e66c77048D68e6438068AfBBf4c96506d7F
INR Token: 0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a
Pool ID: 0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281
Fee: 3000 (0.3%)
Tick Spacing: 60
```

### Faucets:
- Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia
- Alternative: https://faucet.quicknode.com/base/sepolia

### Block Explorers:
- Base Sepolia: https://sepolia.basescan.org
- Uniswap App: https://app.uniswap.org/pools

---

Good luck! 🚀 If you run into any issues, refer to the troubleshooting section or reach out for help.
