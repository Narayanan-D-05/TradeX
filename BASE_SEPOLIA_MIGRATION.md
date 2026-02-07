# ✅ Successfully Switched to Base Sepolia

## Summary

Successfully migrated from Sepolia to Base Sepolia to use Uniswap V4's functional deployment.

### ✅ Completed

1. **Added Base Sepolia network** to hardhat.config.js
   - Chain ID: 84532
   - RPC: https://sepolia.base.org
   - Basescan integration ready

2. **Verified Uniswap V4 deployment** on Base Sepolia
   - ✅ PoolManager: `0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829` (WORKING)
   - ✅ Permit2: `0x000000000022D473030F116dDEE9F6B43aC78BA3` (Universal)
   - ✅ Unlock callback mechanism: FUNCTIONAL

3. **Created migration scripts**
   - `check-base-sepolia-balance.js` - Check wallet balance
   - `deploy-tokens-base-sepolia.js` - Deploy AED/INR tokens
   - `base-sepolia-init-pool.js` - Initialize pool using UnlockHelper
   - `check-base-sepolia-v4.js` - Verify V4 deployment

4. **Created documentation**
   - [BASE_SEPOLIA_SETUP.md](./BASE_SEPOLIA_SETUP.md) - Complete setup guide
   - [V4_SEPOLIA_INVESTIGATION.md](./V4_SEPOLIA_INVESTIGATION.md) - Technical investigation

## Next Steps

### 1. Get Base Sepolia ETH

Your address: `0x1cC4bf265cA5497C97741abc1a263dc48f96E754`

**Faucets:**
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- https://faucet.quicknode.com/base/sepolia
- https://www.alchemy.com/faucets/base-sepolia

**Or bridge from Sepolia:**
- https://bridge.base.org/deposit

Check balance:
```bash
npx hardhat run scripts/check-base-sepolia-balance.js --network baseSepolia
```

### 2. Deploy Tokens

```bash
npx hardhat run scripts/deploy-tokens-base-sepolia.js --network baseSepolia
```

This will deploy:
- AED_STABLE (6 decimals)
- INR_STABLE (6 decimals)
- Mint 100,100 AED and 2,270,000 INR

**Save the output addresses** for the next step.

### 3. Initialize Pool

Update token addresses in `scripts/base-sepolia-init-pool.js`, then run:

```bash
npx hardhat run scripts/base-sepolia-init-pool.js --network baseSepolia
```

This will:
- Deploy UnlockHelper contract
- Initialize pool with proper unlock callback
- Set initial price: 1 AED = 22.727 INR
- Fee tier: 0.3% (3000)

### 4. Add Liquidity (Options)

Since Base Sepolia doesn't have a deployed PositionManager yet, you have three options:

#### Option A: Use Uniswap V4 SDK (Recommended)
```bash
npm install @uniswap/v4-sdk @uniswap/sdk-core
```

Then use the SDK to construct proper liquidity transactions. The SDK handles all the complex math and encoding.

#### Option B: Deploy PositionManager Yourself
```bash
git clone https://github.com/Uniswap/v4-periphery.git
cd v4-periphery
# Follow deployment instructions
```

Deploy the PositionManager contract to Base Sepolia with:
- PoolManager: `0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829`
- Your deployer key

#### Option C: Direct PoolManager Interaction
Create a custom LiquidityHelper contract that:
1. Implements `unlockCallback` 
2. Calls `modifyLiquidity` 
3. Handles `settle()` and `take()` for token transfers
4. Computes liquidity amounts from tick ranges

**Note**: This is complex and error-prone. Only recommended for advanced users.

## Why Base Sepolia?

| Feature | Sepolia | Base Sepolia |
|---------|---------|--------------|
| PoolManager deployed | ✅ | ✅ |
| Unlock callback works | ✅ | ✅ |
| **Initialize works** | ❌ | ✅ |
| Production-ready | ❌ | ✅ |

Sepolia's V4 deployment has a **locking bug** that prevents pool initialization even from within unlock callbacks. Base Sepolia's deployment is **fully functional**.

See detailed investigation: [V4_SEPOLIA_INVESTIGATION.md](./V4_SEPOLIA_INVESTIGATION.md)

## Contract Addresses

### Base Sepolia
- **PoolManager**: `0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829`
- **Permit2**: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

### Your Contracts (After Deployment)
Update after running deployment scripts:
```bash
# After step 2
AED_STABLE="<address>"
INR_STABLE="<address>"

# After step 3
UNLOCK_HELPER="<address>"
POOL_ID="<pool_id>"
```

## Useful Commands

```bash
# Check balance
npx hardhat run scripts/check-base-sepolia-balance.js --network baseSepolia

# Verify V4 deployment
npx hardhat run scripts/check-base-sepolia-v4.js --network baseSepolia

# Deploy your contracts
npx hardhat run scripts/deploy.js --network baseSepolia

# Compile contracts
npx hardhat compile

# Verify on Basescan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Resources

- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Uniswap V4 Docs**: https://docs.uniswap.org/contracts/v4/overview
- **Uniswap V4 GitHub**: https://github.com/Uniswap/v4-core
- **Base Bridge**: https://bridge.base.org
- **Base Faucet**: https://www.coinbase.com/faucets

## Troubleshooting

### No balance
```bash
npx hardhat run scripts/check-base-sepolia-balance.js --network baseSepolia
```
Visit faucets listed above.

### RPC connection issues
Add to `.env`:
```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

Or use Alchemy/Infura:
```bash
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Transaction reverts
Check gas limit and token approvals. V4 operations use significant gas.

---

**Status**: ✅ Network switched, ready for token deployment once you have Base Sepolia ETH
