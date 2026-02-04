# TradeX - INR-AED Atomic Bridge 🌉

**Atomic swaps for India's $100B UAE trade corridor**

[![HackMoney 2026](https://img.shields.io/badge/HackMoney-2026-blue)](https://hackmoney.xyz)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-purple)](https://soliditylang.org)

## 🎯 Overview

TradeX enables **45-second INR↔AED swaps at 0.3% fees** vs traditional banks (3 days, 2.5%) or Binance USDT (30min, 2-3%).

| Method | Time | Fee | Type |
|--------|------|-----|------|
| **TradeX** | 45s | 0.3% | Atomic |
| Banks | 3 days | 2.5% | Manual |
| Binance P2P | 30min | 2-3% | P2P |

## 🏗️ Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Indian User │    │    TradeX       │    │  UAE Broker  │
│ UPI→INR-stbl │───▶│ LI.FI Zap       │───▶│ DFM Account  │
└──────────────┘    │ Arc USDC Hub    │    └──────────────┘
                    │ Yellow Gasless  │
                    └─────────────────┘
```

## 📁 Smart Contracts

| Contract | Description |
|----------|-------------|
| `TradeX.sol` | Main orchestrator - 1-click swap coordination |
| `TradeXBridge.sol` | HTLC atomic swaps with hashlock/timelock |
| `TradeXOracle.sol` | Mock Chainlink-compatible INR/AED price feeds |
| `YellowAdapter.sol` | Gasless session management (ERC-7824) |
| `LIFIRouter.sol` | Cross-chain zap wrapper |
| `ArcGateway.sol` | USDC liquidity hub for Arc network |
| `ComplianceGuard.sol` | KYC/FEMA compliance gates |
| `MockERC20.sol` | Testnet stablecoins (INR-stable, AED-stable) |

## 🚀 Remix Deployment

### Step 1: Open Remix IDE
Navigate to [remix.ethereum.org](https://remix.ethereum.org)

### Step 2: Create Files
Create the following structure in Remix:
```
contracts/
├── interfaces/
│   └── IERC20.sol
├── TradeX.sol
├── TradeXBridge.sol
├── TradeXOracle.sol
├── YellowAdapter.sol
├── LIFIRouter.sol
├── ArcGateway.sol
├── ComplianceGuard.sol
└── MockERC20.sol
```

### Step 3: Compile
- Select Solidity compiler `0.8.20`
- Enable optimization (200 runs)
- Compile each contract

### Step 4: Deploy (Ethereum Sepolia)

**Network Config:**
- RPC: `https://rpc.sepolia.org`
- Chain ID: `11155111`
- Get test ETH: [sepoliafaucet.com](https://sepoliafaucet.com/) or [Alchemy Sepolia Faucet](https://sepoliafaucet.com)

**Deployment Order:**
1. Deploy `MockERC20` (name: "INR Stable", symbol: "INRs", decimals: 18)
2. Deploy `MockERC20` (name: "AED Stable", symbol: "AEDs", decimals: 18)
3. Deploy `TradeXOracle`
4. Deploy `TradeXBridge`
5. Deploy `ComplianceGuard`
6. Deploy `ArcGateway` (pass USDC address or deploy another MockERC20 for USDC)
7. Deploy `YellowAdapter`
8. Deploy `LIFIRouter` (pass zero address for lifiDiamond in demo)
9. Deploy `TradeX` (pass all contract addresses)

### Step 5: Deploy (Arc Testnet)

**Network Config:**
- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Get test USDC: [faucet.circle.com](https://faucet.circle.com)

## 🎮 Demo Flow

### Fund DFM Broker (Raj's Use Case)
```solidity
// 1. Get test tokens
MockERC20(inrStable).faucet(); // Get 10,000 INRs

// 2. Approve TradeX
MockERC20(inrStable).approve(tradeXAddress, 1000000 * 1e18);

// 3. Fund broker with ₹10L
TradeX(tradeX).fundBroker(1000000 * 1e18, brokerAddress);
// Returns: ~446,000 AEDs in 45 seconds!
```

### Send Home (Priya's Use Case)
```solidity
// 1. Approve AED tokens
MockERC20(aedStable).approve(tradeXAddress, 5000 * 1e18);

// 2. Send AED 5K home
TradeX(tradeX).sendHome(5000 * 1e18, recipientAddress);
// Returns: ~₹1.1L to recipient!
```

## 🔧 Key Functions

### TradeX.sol
```solidity
// 1-click broker funding
fundBroker(uint256 inrAmount, address broker) → (orderId, aedAmount)

// 1-click remittance
sendHome(uint256 aedAmount, address recipient) → (orderId, inrAmount)

// Get live quote
getQuote(uint256 amount, bool inrToAed) → (output, fee, rate)
```

### TradeXBridge.sol (HTLC)
```solidity
// Initiate atomic swap
initiateSwap(recipient, token, hashlock, timelock) → swapId

// Complete with preimage
completeSwap(swapId, preimage)

// Refund after timeout
refund(swapId)
```

## 💰 Prize Alignment

| Sponsor | Integration | Prize |
|---------|-------------|-------|
| **Arc** | USDC liquidity hub, native gas | $5K |
| **LI.FI** | Cross-chain zap routing | $2.5K |
| **Yellow** | Gasless sessions (ERC-7824) | $15K |

## 📊 Default Exchange Rates

```
INR/USD: 0.01198 (₹83.5 = $1)
AED/USD: 0.2725 (AED 3.67 = $1)
INR/AED: 0.044 (₹22.75 = 1 AED)
```

## 🔐 Security Features

- **HTLC Atomic Swaps**: Cryptographic guarantees, no counterparty risk
- **Timelock Refunds**: Automatic refund after expiry
- **KYC Gates**: Tiered limits based on verification level
- **FEMA Attestations**: NFT proofs for regulatory compliance

## 📅 Hackathon Timeline

- **Day 1-2**: Smart contracts ✅
- **Day 3-4**: Frontend + UX
- **Day 5-6**: Demo + Submission
- **Day 7**: Judging prep

## 📜 License

MIT License - HackMoney 2026

---

**Built with ❤️ for India-UAE trade corridor**
