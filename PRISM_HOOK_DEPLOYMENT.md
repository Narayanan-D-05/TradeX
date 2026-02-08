# PRISM Hook Deployment Guide

## Current Status
⚠️ **PRISMHook contract is NOT yet deployed**

The contract exists at `contracts/PRISMHook.sol` but needs to be deployed to Base Sepolia.

## To Deploy PRISMHook

### 1. Deploy the Contract
```bash
npx hardhat run scripts/deploy-prism-hook.js --network baseSepolia
```

### 2. Update Frontend Config
After deployment, update the contract address in:
- `frontend/src/lib/prismHookService.ts`
- Replace `address: '0x0000000000000000000000000000000000000000'` with the deployed address

### 3. Authorized Relayer
The deployer is automatically authorized as a relayer in the constructor.

To add more relayers:
```solidity
// On PRISMHook contract
function addRelayer(address relayer) external onlyOwner
```

To remove a relayer:
```solidity
function removeRelayer(address relayer) external onlyOwner
```

## What PRISMHook Does

**PRISMHook.attestSettlement()** accepts:
- `poolId` - The Uniswap V4 pool identifier
- `epoch` - The fixing rate epoch number
- `merkleRoot` - Cryptographic proof of all settlements in batch
- `settlementCount` - Number of settlements in this batch
- `totalVolume` - Total volume processed

This permanently anchors off-chain Yellow Network settlements to the on-chain V4 fixing rate, creating an auditable trail.

## Demo Mode

Until PRISMHook is deployed, the frontend will show:
- ✅ Off-chain attestation generation (Merkle Root + Attestation ID)
- ⚠️ Submit button will show "not deployed" message
- 📋 Users can copy the cryptographic proofs for manual verification

## Benefits of On-Chain Attestation

1. **Permanent Record**: Settlements are cryptographically proven on Base Sepolia
2. **Audit Trail**: Anyone can verify the settlement used the correct V4 fixing rate
3. **Regulatory Compliance**: On-chain proof for compliance requirements
4. **Trustless Verification**: No need to trust off-chain systems

---

**Note**: This is a demo for the hackathon. In production, a relayer service would batch and submit attestations automatically every epoch.
