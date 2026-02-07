# Base Sepolia Setup Guide

## Getting Base Sepolia ETH

Your deployer address: **0x1cC4bf265cA5497C97741abc1a263dc48f96E754**

### Option 1: Official Base Faucet (Recommended)
1. Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Connect wallet or paste address: `0x1cC4bf265cA5497C97741abc1a263dc48f96E754`
3. Claim test ETH (may require Coinbase account)

### Option 2: Bridge from Sepolia ETH
1. Get Sepolia ETH first: https://sepoliafaucet.com
2. Bridge to Base Sepolia: https://bridge.base.org/deposit
3. Select "Sepolia" → "Base Sepolia"
4. Bridge amount (minimum ~0.01 ETH recommended)

### Option 3: Third-Party Faucets
- https://faucet.quicknode.com/base/sepolia
- https://www.alchemy.com/faucets/base-sepolia
- https://faucets.chain.link/base-sepolia

## Verify Balance

After getting ETH, check your balance:
```bash
npx hardhat run scripts/check-base-sepolia-balance.js --network baseSepolia
```

## Next Steps

Once you have balance (>0.01 ETH recommended):

1. **Deploy Tokens**
   ```bash
   npx hardhat run scripts/deploy-tokens-base-sepolia.js --network baseSepolia
   ```

2. **Initialize Pool** (using UnlockHelper)
   ```bash
   npx hardhat run scripts/base-sepolia-init-pool.js --network baseSepolia
   ```

3. **Add Liquidity**
   ```bash
   npx hardhat run scripts/base-sepolia-add-liquidity.js --network baseSepolia
   ```

## Base Sepolia Network Details

- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Symbol**: ETH

## Uniswap V4 Contracts on Base Sepolia

- **PoolManager**: `0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829` ✅ WORKING
- **Permit2**: `0x000000000022D473030F116dDEE9F6B43aC78BA3` ✅ Universal

**Note**: We use UnlockHelper contract instead of PositionManager for pool initialization.

## Why Base Sepolia?

Sepolia mainnet's Uniswap V4 deployment has a broken locking mechanism that prevents pool initialization. Base Sepolia has a **fully functional V4 deployment** with working unlock callbacks.

See [V4_SEPOLIA_INVESTIGATION.md](./V4_SEPOLIA_INVESTIGATION.md) for technical details.
