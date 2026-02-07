# Add Liquidity to Uniswap V4 Pool (Base Sepolia) - Script Guide

## 🎯 Quick Start

This guide shows you how to add liquidity to your Uniswap V4 pool on Base Sepolia using Hardhat scripts (not the UI).

---

## ✅ Prerequisites

1. **Node.js and npm** installed
2. **Hardhat project** set up (already done in TradeX)
3. **Base Sepolia ETH** in your wallet (for gas)
4. **Private key** in `.env` file as `DEPLOYER_PRIVATE_KEY`
5. **Pool already initialized** (you have this: Pool ID `0x33ee8...`)

---

## 📝 Step-by-Step Process

### Step 1: Get Base Sepolia ETH

You need ETH on Base Sepolia to pay for gas fees.

1. Visit: https://www.alchemy.com/faucets/base-sepolia
2. Connect your wallet
3. Get 0.1 ETH (free)
4. Wait ~1 minute for it to arrive

Check your balance:
```powershell
# In PowerShell
cd C:\Users\dnara\Desktop\Projects\TradeX
npx hardhat console --network baseSepolia
```

Then in the console:
```javascript
const balance = await ethers.provider.getBalance("YOUR_ADDRESS_HERE")
console.log(ethers.utils.formatEther(balance))
// Should show ~0.1 ETH
```

---

### Step 2: Get AED and INR Tokens

You need both tokens to add liquidity to the pool.

#### Option A: Mint Tokens (If you're the deployer)

```powershell
npx hardhat run scripts/mint-base-sepolia-tokens.js --network baseSepolia
```

This will mint:
- 1,000 AED
- 22,730 INR (proportional for 1 AED = 22.73 INR exchange rate)

#### Option B: Use Faucet on BaseScan

If the script doesn't work (you're not the token owner):

1. **For AED Token:**
   - Go to: https://sepolia.basescan.org/address/0xd16B4e66c77048D68e6438068AfBBf4c96506d7F#writeContract
   - Click "Connect to Web3"
   - Find `faucet` or `mint` function
   - Call it to get tokens

2. **For INR Token:**
   - Go to: https://sepolia.basescan.org/address/0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a#writeContract
   - Same process as AED

#### Verify Token Balances

```powershell
npx hardhat run scripts/check-base-sepolia-balance.js --network baseSepolia
```

You should see both AED and INR in your wallet.

---

### Step 3: Mint V4 Liquidity Position

Now add liquidity to the pool using the PositionManager contract:

```powershell
npx hardhat run scripts/mint-v4-position-base-sepolia.js --network baseSepolia
```

**What this script does:**
1. ✅ Checks your AED and INR balances
2. ✅ Approves tokens to PositionManager contract
3. ✅ Encodes actions according to Uniswap V4 spec:
   - `MINT_POSITION` action
   - `SETTLE_PAIR` action (to pay tokens)
4. ✅ Calls `modifyLiquidities()` on PositionManager
5. ✅ Mints you an NFT representing your liquidity position
6. ✅ Returns your Position NFT Token ID

**Expected Output:**
```
🦄 Minting Uniswap V4 Position on Base Sepolia

Signer address: 0x1cC4bf265cA5497C97741abc1a263dc48f96E754

Token Balances:
AED: 1000.0 AED
INR: 22730.0 INR

Adding Liquidity:
AED: 100.0
INR: 2273.0

Tick Range: -887220 to 887220 (Full Range)
Liquidity: 150.0

1️⃣ Approving tokens...
✅ AED approved
✅ INR approved

2️⃣ Encoding actions...
Actions encoded: 0x0007

3️⃣ Encoding parameters...
Parameters encoded

4️⃣ Minting position...
Transaction submitted: 0x...
Waiting for confirmation...

✅ Position minted successfully!
Transaction hash: 0x...
Gas used: 450000

🎉 Position NFT Token ID: 12345

📊 View on BaseScan:
https://sepolia.basescan.org/tx/0x...

✅ Success! You can now:
1. View your position on the PositionManager contract
2. Perform swaps on your TradeX frontend
3. Increase/decrease liquidity as needed
```

---

## 🔍 Verify Liquidity Was Added

### Check on BaseScan

1. Go to your transaction: https://sepolia.basescan.org/tx/YOUR_TX_HASH
2. Click "Logs" tab
3. Look for events:
   - `Transfer` event (NFT minted to you)
   - `ModifyLiquidity` event (liquidity added to pool)

### Check Position on PositionManager

Visit: https://sepolia.basescan.org/address/0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80#readContract

1. Find `getPositionInfo` function
2. Enter your Position Token ID
3. Click "Query"
4. You'll see:
   - token0: AED address
   - token1: INR address
   - fee: 3000 (0.3%)
   - tickLower and tickUpper
   - liquidity amount

---

## 🚀 Test on TradeX Frontend

After adding liquidity:

1. Start your frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

2. Navigate to: http://localhost:3000

3. **What should change:**
   - ❌ "Pool not initialized" warning → **GONE**
   - ✅ Uniswap V4 quote appears with real exchange rate
   - ✅ You can execute swaps through V4
   - ✅ No more liquidity errors

4. **Try a swap:**
   - Enter: 100 INR
   - Select: AED
   - You should see: "You'll receive ~4.4 AED"
   - Execute the swap!

---

## 🛠️ Script Parameters Explained

### Liquidity Amount
The script adds **100 AED + 2,273 INR** by default.

To change amounts, edit [mint-v4-position-base-sepolia.js](mint-v4-position-base-sepolia.js):

```javascript
// Line ~60
const aedAmount = ethers.utils.parseUnits("100", 6); // Change 100
const inrAmount = ethers.utils.parseUnits("2273", 6); // Change 2273
```

Rule: Keep the ratio at `1 AED = 22.73 INR` (the pool's initialized price).

### Tick Range

The script uses **full range** by default (`-887220` to `887220`).

This means your liquidity is active at all prices. For more concentrated liquidity, edit:

```javascript
// Line ~70
const tickLower = -887220;  // Change to higher value
const tickUpper = 887220;   // Change to lower value
```

Example for concentrated liquidity around 1 AED = 20-25 INR:
```javascript
const tickLower = -200000;  // ~20 INR per AED
const tickUpper = 200000;   // ~25 INR per AED
```

**Note:** Ticks must be divisible by `tickSpacing = 60`.

---

## 🆘 Troubleshooting

### Error: "insufficient funds for gas"

**Solution:** Get more Base Sepolia ETH
- https://www.alchemy.com/faucets/base-sepolia
- You need at least 0.01 ETH

### Error: "Insufficient balance"

**Solution:** Mint more tokens
```powershell
npx hardhat run scripts/mint-base-sepolia-tokens.js --network baseSepolia
```

### Error: "Ownable: caller is not the owner"

**Solution:** You're not the token deployer. Use BaseScan faucet:
- AED: https://sepolia.basescan.org/address/0xd16B4e66c77048D68e6438068AfBBf4c96506d7F#writeContract
- INR: https://sepolia.basescan.org/address/0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a#writeContract

### Error: "execution reverted"

**Solution:** Check that:
1. Pool is initialized ✅ (You have this)
2. Tokens are approved ✅ (Script does this)
3. Fee tier matches: 3000 ✅ (Script uses correct value)
4. Tick spacing matches: 60 ✅ (Script uses correct value)
5. Hooks address is zero ✅ (Script uses 0x000...)

### Transaction takes forever

**Solution:** Increase gas price in script:
```javascript
const tx = await positionManager.modifyLiquidities(
  ...,
  ...,
  {
    gasLimit: 3000000,
    gasPrice: ethers.utils.parseUnits("2", "gwei"), // Add this
  }
);
```

---

## 📚 Technical Details

### How It Works (Uniswap V4 Spec)

1. **PositionManager Contract:**
   - Address: `0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80`
   - Manages all V4 liquidity positions as ERC-721 NFTs
   - Command-based: encodes actions + parameters

2. **Actions Encoding:**
   ```javascript
   actions = [MINT_POSITION, SETTLE_PAIR]
   ```
   - `MINT_POSITION`: Creates new liquidity position
   - `SETTLE_PAIR`: Pays both tokens (AED + INR)

3. **Parameters Encoding:**
   ```javascript
   params[0] = encode(poolKey, tickLower, tickUpper, liquidity, ...)
   params[1] = encode(currency0, currency1)
   ```

4. **Entry Point:**
   ```solidity
   positionManager.modifyLiquidities(
     abi.encode(actions, params),
     deadline
   )
   ```

### Contracts Used

| Contract | Address | Purpose |
|----------|---------|---------|
| PoolManager | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` | Core V4 pools |
| PositionManager | `0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80` | Liquidity NFTs |
| AED Token | `0xd16B4e66c77048D68e6438068AfBBf4c96506d7F` | Currency0 |
| INR Token | `0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a` | Currency1 |

---

## 📖 References

- Uniswap V4 Docs: https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/mint-position
- Base Sepolia Explorer: https://sepolia.basescan.org
- Your Pool ID: `0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281`

---

## ✅ Summary Checklist

- [ ] Have Base Sepolia ETH for gas
- [ ] Have AED and INR tokens in wallet
- [ ] Pool is initialized (✅ you have this)
- [ ] Run: `npx hardhat run scripts/mint-v4-position-base-sepolia.js --network baseSepolia`
- [ ] Get Position NFT Token ID
- [ ] Verify on BaseScan
- [ ] Test swaps on TradeX frontend

---

## 🎉 Success Criteria

After completing these steps:

✅ You own a Uniswap V4 Position NFT  
✅ Your AED/INR pool has liquidity  
✅ TradeX frontend shows V4 quotes  
✅ You can execute swaps through V4  
✅ You earn 0.3% fees on all swaps (very small on testnet)

---

**Need help?** Check the troubleshooting section or open an issue.

**Ready to go?** Start with Step 1! 🚀
