# 🎯 Quick Guide: Get TxIDs for Submission

This guide helps you collect all transaction IDs needed for the HackMoney 2026 submission.

---

## ✅ Step 1: Deploy Tokens (5 minutes)

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Expected Output:

```
Deploying to network: sepolia
Deployer address: 0xYourAddress
Deployer balance: 0.5 ETH

Deploying MockERC20 INR Token...
✅ INR Token deployed to: 0xC6DADFdf4c046D0A91946351A0aceee261DcA517

Deploying MockERC20 AED Token...
✅ AED Token deployed to: 0x05016024652D0c947E5B49532e4287374720d3b2

Deploying TradeX contract...
✅ TradeX deployed to: 0x1234567890ABCDEF...

Deployment complete!
```

### 📝 Save These:

| Item | Address | Etherscan Link |
|------|---------|----------------|
| **INR Token** | `0xC6DADFdf4c046D0A91946351A0aceee261DcA517` | `https://sepolia.etherscan.io/address/0xC6DADFdf4c046D0A91946351A0aceee261DcA517` |
| **AED Token** | `0x05016024652D0c947E5B49532e4287374720d3b2` | `https://sepolia.etherscan.io/address/0x05016024652D0c947E5B49532e4287374720d3b2` |
| **TradeX Contract** | [Your address here] | [Etherscan link] |

---

## ✅ Step 2: Create Uniswap V3 Pool (10 minutes)

```bash
npx hardhat run scripts/setup-uniswap-pool.js --network sepolia
```

### Expected Output:

```
🦄 Starting Uniswap V3 Pool Setup for INR/AED
================================================

Deployer: 0xYourAddress
Balance: 0.45 ETH (sufficient)

Token Addresses:
INR Token: 0xC6DADFdf4c046D0A91946351A0aceee261DcA517
AED Token: 0x05016024652D0c947E5B49532e4287374720d3b2

Uniswap V3 Contracts (Sepolia):
Factory: 0x0227628f3F023bb0B980b67D528571c95c6DaC1c
Position Manager: 0x1238536071E1c677A632429e3655c799b22cDA52
Swap Router: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
Quoter V2: 0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3

1️⃣  Checking for existing pool...
Pool doesn't exist. Creating new pool...

2️⃣  Price Calculation:
   Token0: INR (0xC6DADFdf4c046D0A91946351A0aceee261DcA517)
   Token1: AED (0x05016024652D0c947E5B49532e4287374720d3b2)
   Oracle Price: 1 AED = 22.727 INR
   Price Ratio (token1/token0): 0.044
   sqrtPriceX96: 16598351903594863263787951695...

3️⃣  Creating and initializing pool...
   Creating pool with fee tier: 3000 (0.3%)
   Initial sqrtPriceX96: 16598351903594863263787951695...
✅ Pool created and initialized!
   Transaction hash: 0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890

4️⃣  Checking token balances...
   INR Balance: 1000000.0 INR
   AED Balance: 44000.0 AED
   ✅ Sufficient balance for liquidity provision

5️⃣  Approving Position Manager...
   Approving INR...
   ✅ INR approval transaction: 0x1111111111111111111111111111111111111111111111111111111111111111
   Approving AED...
   ✅ AED approval transaction: 0x2222222222222222222222222222222222222222222222222222222222222222

6️⃣  Adding liquidity to pool...
   Amount INR: 1000000.0
   Amount AED: 44000.0
   Tick Range: -887200 to 887200 (full range)
   Minting position...
✅ Liquidity added successfully!
   Transaction hash: 0xDEF4567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
   Gas used: 450000
   Position Token ID: 12345

7️⃣  Verifying pool setup...
   Pool Address: 0x9876543210FEDCBA9876543210FEDCBA98765432
   Current sqrtPriceX96: 16598351903594863263787951695...
   Current Tick: -73136
   Total Liquidity: 500000000000000000000000
   
================================================
✅ Uniswap V3 Pool Setup Complete!
================================================

Summary:
--------
Pool Address: 0x9876543210FEDCBA9876543210FEDCBA98765432
Creation TxHash: 0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890
Liquidity TxHash: 0xDEF4567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
Fee Tier: 0.3%
Initial Liquidity: 1M INR + 44K AED

Next Steps:
----------
1. Verify on Etherscan: https://sepolia.etherscan.io/address/0x9876543210FEDCBA9876543210FEDCBA98765432
2. Test swaps using frontend
3. Update .env with pool address if needed

Pool is now live and ready for swaps! 🎉
```

### 📝 Save These:

| Item | Value | Etherscan Link |
|------|-------|----------------|
| **Pool Creation TxHash** | `0xABCDEF123...` | `https://sepolia.etherscan.io/tx/0xABCDEF123...` |
| **Liquidity Add TxHash** | `0xDEF456789...` | `https://sepolia.etherscan.io/tx/0xDEF456789...` |
| **Pool Address** | `0x98765432...` | `https://sepolia.etherscan.io/address/0x98765432...` |
| **Position Token ID** | `12345` | Use in NFT explorers |

---

## ✅ Step 3: Test Swap Transaction (5 minutes)

### A. Start Frontend

```bash
cd frontend
npm run dev
```

Visit: `http://localhost:3000`

### B. Connect Wallet

1. Click **"Connect Wallet"** button
2. Approve MetaMask connection
3. Ensure you're on **Sepolia** network
4. Balance should show: `10,000 INR` (from faucet)

### C. Execute Test Swap

1. **Select Mode**: Choose "Yellow Network" (gasless)
2. **Enter Amount**: `100` INR
3. **Recipient**: Enter test address or ENS name
   - Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4`
   - Or use ENS: `yourname.eth` (if available)
4. **Check Live Price**:
   - Look for **🦄 Uniswap Live Price** panel
   - Should show: "You'll receive: ~4.4 AED"
   - Exchange rate: "1 AED = 22.727 INR"
5. **Click "Swap"**
6. **Approve Transaction** in MetaMask (if using old mode) or auto-approve (Yellow mode)
7. **Wait 2 seconds** ⚡
8. **Success!** - Copy TxID from success message

### Expected Success Message:

```
✅ Swap Successful!

Amount Sent: 100 INR
Amount Received: 4.4 AED
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4
Transaction: 0x123456789ABCDEF...
Gas Used: 0 (Yellow Network)
Time Elapsed: 2.1s

View on Etherscan →
```

### 📝 Save This:

| Item | Value | Etherscan Link |
|------|-------|----------------|
| **Swap TxHash** | `0x123456789ABCDEF...` | `https://sepolia.etherscan.io/tx/0x123456789ABCDEF...` |

---

## ✅ Step 4: Verify on Etherscan

Visit each Etherscan link above and take screenshots showing:

1. ✅ **Token Deployments** - Contract creation timestamps
2. ✅ **Pool Creation** - Uniswap V3 pool initialization
3. ✅ **Liquidity Provision** - Position minting with 1M INR + 44K AED
4. ✅ **Swap Transaction** - Successful token swap via pool

---

## 📋 Submission Checklist

Copy these to your submission form:

```
=== TradeX - Uniswap HackMoney 2026 Submission ===

GitHub Repository:
https://github.com/YourUsername/TradeX

Demo Video (YouTube):
https://www.youtube.com/watch?v=...

Transaction IDs (Sepolia Testnet):

1. INR Token Deployment:
   0xC6DADFdf4c046D0A91946351A0aceee261DcA517
   https://sepolia.etherscan.io/address/0xC6DADFdf4c046D0A91946351A0aceee261DcA517

2. AED Token Deployment:
   0x05016024652D0c947E5B49532e4287374720d3b2
   https://sepolia.etherscan.io/address/0x05016024652D0c947E5B49532e4287374720d3b2

3. Uniswap V3 Pool Creation:
   TxHash: 0xABCDEF123...
   https://sepolia.etherscan.io/tx/0xABCDEF123...

4. Liquidity Provision:
   TxHash: 0xDEF456789...
   https://sepolia.etherscan.io/tx/0xDEF456789...

5. Pool Address:
   0x98765432...
   https://sepolia.etherscan.io/address/0x98765432...

6. Test Swap Transaction:
   TxHash: 0x123456789ABCDEF...
   https://sepolia.etherscan.io/tx/0x123456789ABCDEF...

Technologies Used:
- Uniswap V3 SDK (Liquidity pools for decentralized pricing)
- Yellow Network (Gasless state channel transactions)
- ENS (Human-readable addresses)
- Circle/Arc (Embedded wallets)

Key Features:
- Real-time market pricing via Uniswap V3 pools
- $0 gas fees via Yellow Network state channels
- 2-second settlements
- ENS resolution (send to name.eth)

Documentation:
See README.md for full setup instructions and architecture

Demo Instructions:
See SUBMISSION.md for detailed demo guide

=== End Submission ===
```

---

## 🎥 Demo Video Tips

When recording your 3-minute demo:

1. **Show Terminal Output** (large font)
   - Pool creation command
   - Transaction hashes appearing in real-time

2. **Show Etherscan Pages**
   - Navigate to each transaction
   - Highlight "Success" status
   - Show timestamp and gas used

3. **Show Frontend UI**
   - Enter amounts and see live Uniswap quotes
   - ENS resolution (if available)
   - Success message with TxID

4. **Narration Script**
   - Explain what each transaction does
   - Highlight Uniswap V3 integration
   - Emphasize gasless Yellow Network execution
   - Show real timestamps (2s settlement)

---

## ⚡ Quick Commands Reference

```bash
# Deploy tokens
npx hardhat run scripts/deploy.js --network sepolia

# Create Uniswap pool
npx hardhat run scripts/setup-uniswap-pool.js --network sepolia

# Start frontend
cd frontend && npm run dev

# Check Sepolia balance
npx hardhat run scripts/check-balance.js --network sepolia

# View all scripts
ls scripts/
```

---

## 🔧 Troubleshooting

**"Insufficient funds for gas"**
```bash
# Get Sepolia ETH from faucet
# Visit: https://sepoliafaucet.com
# Or: https://www.infura.io/faucet/sepolia
```

**"Pool already exists"**
```bash
# Check existing pool address
npx hardhat run scripts/check-status.js --network sepolia
# Script will show existing pool details
```

**"Transaction failed"**
```bash
# Check gas limit in hardhat.config.js
# Ensure deployer has at least 0.5 ETH on Sepolia
```

**"Frontend not connecting"**
```bash
# Clear Next.js cache
rm -rf frontend/.next
cd frontend && npm run dev
```

---

## 📞 Need Help?

- Check [SUBMISSION.md](./SUBMISSION.md) for detailed submission requirements
- See [README.md](./README.md) for full documentation
- Review [scripts/setup-uniswap-pool.js](./scripts/setup-uniswap-pool.js) for technical details

---

**Good luck with your submission! 🚀**
