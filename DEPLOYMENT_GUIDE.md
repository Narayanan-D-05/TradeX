# TradeX Remix Deployment Guide

## Quick Links
- **Remix IDE**: https://remix.ethereum.org
- **Sepolia Faucet**: https://sepoliafaucet.com

---

## Step 1: Open Remix IDE
1. Go to https://remix.ethereum.org
2. Close any welcome dialogs

## Step 2: Create Files
In the File Explorer (left panel), create folder `contracts/` and add:

```
contracts/
├── interfaces/
│   └── IERC20.sol
├── MockERC20.sol
├── TradeXOracle.sol
├── TradeXBridge.sol
├── ComplianceGuard.sol
├── ArcGateway.sol
├── YellowAdapter.sol
├── LIFIRouter.sol
└── TradeX.sol
```

**Copy each file** from: `c:\Users\dnara\Desktop\Projects\TradeX\contracts\`

## Step 3: Compile
1. Click **Solidity Compiler** tab (left sidebar, 2nd icon)
2. Compiler version: `0.8.20`
3. Enable Optimization: `200` runs
4. Click **Compile** for each contract

## Step 4: Deploy to Sepolia

### Connect MetaMask
1. Click **Deploy & Run** tab (3rd icon)
2. Environment: **Injected Provider - MetaMask**
3. MetaMask will popup → Select **Sepolia** network
4. Confirm connection

### Deploy Order (Copy addresses after each deploy!)

#### 1. Deploy MockERC20 (INR-stable)
```
Constructor args:
_name: "INR Stable"
_symbol: "INRs" 
_decimals: 18
```
📝 Save address: `INR_STABLE = 0x...`

#### 2. Deploy MockERC20 (AED-stable)
```
Constructor args:
_name: "AED Stable"
_symbol: "AEDs"
_decimals: 18
```
📝 Save address: `AED_STABLE = 0x...`

#### 3. Deploy MockERC20 (Mock USDC)
```
Constructor args:
_name: "USD Coin"
_symbol: "USDC"
_decimals: 6
```
📝 Save address: `USDC = 0x...`

#### 4. Deploy TradeXOracle
```
No constructor args needed
```
📝 Save address: `ORACLE = 0x...`

#### 5. Deploy TradeXBridge
```
No constructor args needed
```
📝 Save address: `BRIDGE = 0x...`

#### 6. Deploy ComplianceGuard
```
No constructor args needed
```
📝 Save address: `COMPLIANCE = 0x...`

#### 7. Deploy ArcGateway
```
Constructor args:
_usdc: [USDC address]
_aedStable: [AED_STABLE address]
_oracle: [ORACLE address]
```
📝 Save address: `ARC_GATEWAY = 0x...`

#### 8. Deploy YellowAdapter
```
No constructor args needed
```
📝 Save address: `YELLOW_ADAPTER = 0x...`

#### 9. Deploy LIFIRouter
```
Constructor args:
_lifiDiamond: 0x0000000000000000000000000000000000000000
```
📝 Save address: `LIFI_ROUTER = 0x...`

#### 10. Deploy TradeX (Main Contract)
```
Constructor args:
_bridge: [BRIDGE address]
_oracle: [ORACLE address]
_arcGateway: [ARC_GATEWAY address]
_compliance: [COMPLIANCE address]
_inrStable: [INR_STABLE address]
_aedStable: [AED_STABLE address]
_usdc: [USDC address]
```
📝 Save address: `TRADEX = 0x...`

---

## Step 5: Get Test Tokens

After deploying MockERC20 contracts, call the `faucet()` function on each:
1. Select deployed MockERC20 (INR)
2. Expand contract functions
3. Click **faucet** button
4. Confirm in MetaMask
5. Repeat for AED and USDC

---

## Step 6: Test the System

### Test fundBroker flow:
1. Approve TradeX to spend INR tokens:
   - On INR MockERC20 → `approve(TRADEX_ADDRESS, 1000000000000000000000000)`
2. Call TradeX → `fundBroker`:
   - `_inrAmount`: 1000000000000000000000 (1000 INR with 18 decimals)
   - `_brokerAddress`: your wallet address

---

## Deployed Addresses Template

```
INR_STABLE    = 0x________________________________
AED_STABLE    = 0x________________________________
USDC          = 0x________________________________
ORACLE        = 0x________________________________
BRIDGE        = 0x________________________________
COMPLIANCE    = 0x________________________________
ARC_GATEWAY   = 0x________________________________
YELLOW_ADAPTER= 0x________________________________
LIFI_ROUTER   = 0x________________________________
TRADEX        = 0x________________________________
```

After deploying, update `frontend/src/lib/contracts.ts` with these addresses!
