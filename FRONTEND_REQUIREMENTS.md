# TradeX Frontend Development Requirements

**Project**: TradeX - INR-AED Atomic Bridge  
**Version**: 1.0  
**Updated**: February 2026  
**Framework**: Next.js 15 + React 19 + TypeScript

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack Requirements](#tech-stack-requirements)
3. [Design System](#design-system)
4. [Pages & Features](#pages--features)
5. [Components Specification](#components-specification)
6. [Web3 Integration](#web3-integration)
7. [State Management](#state-management)
8. [Responsive Design](#responsive-design)
9. [Performance Requirements](#performance-requirements)
10. [Testing Requirements](#testing-requirements)
11. [Deployment Requirements](#deployment-requirements)

---

## 🎯 Project Overview

### Mission
Build a stunning, user-friendly frontend for TradeX that enables instant INR↔AED cross-chain swaps with a focus on:
- **Speed**: Sub-second interactions, instant feedback
- **Beauty**: Premium, modern UI that wows users at first glance
- **Simplicity**: Complex blockchain operations feel simple
- **Trust**: Clear transaction status, transparent fees

### Target Users
1. **Indian Investors** (Raj) - Funding UAE brokerage accounts
2. **UAE Expats** (Priya) - Sending money home to India
3. **Technical Level**: 60% crypto beginners, 40% experienced DeFi users

### Success Metrics
- Time to first swap: < 2 minutes (including wallet setup)
- User satisfaction: Visual appeal rated 8/10+
- Mobile usage: 50%+ of traffic
- Conversion rate: 70%+ of connected wallets complete a swap

---

## 💻 Tech Stack Requirements

### Core Framework
```json
{
  "framework": "Next.js 15+",
  "react": "19+",
  "typescript": "5+",
  "node": "18+"
}
```

### Required Dependencies

#### Web3 & Blockchain
```bash
npm install wagmi viem @rainbow-me/rainbowkit
```
- **wagmi**: React hooks for Ethereum
- **viem**: TypeScript Ethereum library
- **RainbowKit**: Wallet connection UI (customizable)

#### UI & Styling
```bash
npm install tailwindcss autoprefixer postcss
npm install framer-motion  # Animations
npm install lucide-react   # Icons (optional: can use emojis)
```

#### Utilities
```bash
npm install ethers  # For contract interactions
npm install date-fns  # Date formatting
npm install react-hot-toast  # Notifications
```

### Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Web3Provider
│   │   ├── page.tsx            # Home page (main swap interface)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── Header.tsx          # Navigation + wallet connection
│   │   ├── SwapCard.tsx        # Main swap interface (CRITICAL)
│   │   ├── WalletButton.tsx    # Connect wallet button
│   │   ├── StatsGrid.tsx       # Platform statistics
│   │   ├── NetworkFlow.tsx     # Visual flow diagram
│   │   ├── TransactionStatus.tsx  # Transaction feedback
│   │   └── Footer.tsx          # Footer with links
│   ├── providers/
│   │   └── Web3Provider.tsx    # Wagmi + RainbowKit setup
│   ├── hooks/
│   │   ├── useSwap.ts          # Custom swap logic
│   │   └── useTokenBalance.ts  # Token balance fetching
│   ├── constants/
│   │   ├── contracts.ts        # Contract addresses & ABIs
│   │   └── chains.ts           # Custom chain configs
│   └── types/
│       └── index.ts            # TypeScript types
├── public/
│   ├── favicon.ico
│   └── og-image.png            # Social media preview
└── tailwind.config.ts
```

---

## 🎨 Design System

### Color Palette

**CRITICAL**: Use rich, vibrant colors - NOT plain red/blue/green

```css
/* Primary - Indigo/Purple Gradient */
--primary-500: #6366f1;
--primary-600: #4f46e5;
--primary-700: #4338ca;

/* Success - Emerald */
--success-400: #34d399;
--success-500: #10b981;

/* Warning - Amber */
--warning-400: #fbbf24;
--warning-500: #f59e0b;

/* Error - Red */
--error-400: #f87171;
--error-500: #ef4444;

/* Background - Dark Theme */
--bg-primary: #0f172a;      /* Slate 900 */
--bg-secondary: #1e293b;    /* Slate 800 */
--bg-card: #1e293b;         /* Slate 800 with transparency */
--bg-hover: #334155;        /* Slate 700 */

/* Text */
--text-primary: #f1f5f9;    /* Slate 100 */
--text-secondary: #94a3b8;  /* Slate 400 */
--text-muted: #64748b;      /* Slate 500 */
```

### Typography

**Font**: Use Google Fonts - Inter or Outfit

```css
/* Headings */
h1: 4rem (64px), font-weight: 700
h2: 3rem (48px), font-weight: 700
h3: 2rem (32px), font-weight: 600
h4: 1.5rem (24px), font-weight: 600

/* Body */
body: 1rem (16px), font-weight: 400
small: 0.875rem (14px), font-weight: 400
```

### Effects & Animations

**CRITICAL**: Make the UI feel alive and premium

1. **Glassmorphism Cards**
```css
.glass-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

2. **Hover Effects**
- All buttons: scale(1.02) + brightness increase
- Cards: subtle lift (translateY(-4px))
- Duration: 200ms cubic-bezier(0.4, 0, 0.2, 1)

3. **Micro-animations**
- Pulse effect on live indicators
- Shimmer on loading states
- Success checkmark animation
- Error shake animation

4. **Gradients**
```css
.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Component Patterns

**Buttons**
```tsx
// Primary Button
className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 
           hover:from-indigo-500 hover:to-purple-500 
           rounded-xl font-semibold text-white
           transition-all duration-200 
           hover:scale-102 disabled:opacity-50"

// Secondary Button
className="px-6 py-3 bg-slate-800 hover:bg-slate-700 
           border border-slate-700 rounded-xl font-semibold"
```

**Inputs**
```tsx
className="w-full px-4 py-3 bg-slate-900 border border-slate-700 
           rounded-xl focus:border-indigo-500 focus:ring-2 
           focus:ring-indigo-500/20 text-white"
```

---

## 📄 Pages & Features

### 1. Home Page (`app/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│          Header (Wallet Button)          │
├─────────────────────────────────────────┤
│                                          │
│           Hero Section                   │
│   "INR-AED Atomic Bridge"               │
│   Quick stats: 45s | 0.3% | 70% saving │
│                                          │
├──────────────┬───────────────────────────┤
│              │                           │
│  Swap Card   │   Network Flow Visual    │
│  (Main UI)   │   + Use Cases            │
│              │                           │
├──────────────┴───────────────────────────┤
│          Stats Grid                      │
│   (TVL, Volume, Swaps, etc.)            │
├─────────────────────────────────────────┤
│          Sponsors Section                │
├─────────────────────────────────────────┤
│              Footer                      │
└─────────────────────────────────────────┘
```

**Required Sections**:

1. **Hero Section**
   - Large title with gradient effect
   - Subtitle explaining the use case
   - Quick stats badges (45s settlement, 0.3% fee, 70% savings)
   - Subtle animated background (optional)

2. **Swap Interface** (See Components section)

3. **Stats Grid**
   - Total Value Locked (TVL)
   - 24h Volume
   - Total Swaps
   - Average Time
   - All should auto-update from contract events

4. **Network Flow Visualization**
   - Animated diagram showing: Sepolia → LI.FI → Arc
   - Light up during active swap

5. **Use Cases**
   - Raj's story (Fund Broker)
   - Priya's story (Send Home)
   - Each with icon, description, savings example

6. **Sponsors**
   - Arc, LI.FI, Yellow Network logos
   - Links to sponsor websites

---

## 🧩 Components Specification

### 1. Header Component

**File**: `src/components/Header.tsx`

**Requirements**:
- Logo/Brand name on the left
- Navigation links (optional: Docs, GitHub)
- **WalletButton** on the right
- Sticky on scroll
- Mobile responsive (hamburger menu if needed)

**Props**: None (stateless)

**Example Code Structure**:
```tsx
export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌉</span>
          <span className="text-xl font-bold gradient-text">TradeX</span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
```

---

### 2. SwapCard Component ⭐ **MOST CRITICAL**

**File**: `src/components/SwapCard.tsx`

**Requirements**:

**State Management**:
```tsx
const [mode, setMode] = useState<'fundBroker' | 'sendHome'>('fundBroker');
const [amount, setAmount] = useState('');
const [recipient, setRecipient] = useState('');
const [step, setStep] = useState<'idle' | 'approving' | 'swapping' | 'success' | 'error'>('idle');
```

**UI Elements**:

1. **Mode Switcher (Top)**
   - Two tabs: "🏦 Fund Broker" | "🏠 Send Home"
   - Highlight active mode
   - Switches between INR→AED and AED→INR

2. **From Input**
   - Label: "You Send"
   - Large input field (text-2xl font)
   - Currency badge (INR or AED with flag/symbol)
   - Balance display (if connected)
   - "Max" button to fill available balance
   - Network indicator (Sepolia or Arc)

3. **Swap Direction Indicator**
   - Centered icon (arrow down)
   - Animated on hover

4. **To Output (Read-only)**
   - Label: "Recipient Gets"
   - Calculated output amount (auto-updates)
   - Currency badge (opposite of input)
   - Network indicator (destination chain)

5. **Recipient Address Input**
   - Label: "Broker Wallet Address" or "Recipient Wallet Address"
   - Input field (monospace font)
   - Placeholder: "0x..."
   - Validation: Check if valid Ethereum address

6. **Fee Breakdown Panel**
   - Exchange rate
   - Platform fee (0.3%)
   - Network fee (Gasless or ~0.0002 ETH)
   - Estimated time (~45 seconds)
   - Savings vs banks (70%)

7. **Swap Button**
   - Large, prominent
   - States:
     - Disconnected: "🔗 Connect Wallet First"
     - Idle: "🚀 Fund Broker" or "✈️ Send Home"
     - Approving: "⏳ Approving..." (with spinner)
     - Swapping: "⏳ Confirming Swap..." (with spinner)
     - Success: Show checkmark + "Make Another Swap" button
     - Error: Show error message + "Try Again" button

8. **Transaction Status**
   - Success state: Green checkmark, transaction hash link
   - Error state: Red X, error message, retry button
   - Loading state: Spinner animation

9. **Faucet Button** (for testnet)
   - Small button below: "Need test tokens?"
   - Calls token.faucet() to mint 10,000 tokens
   - Shows loading state

**Contract Integration**:

```tsx
// Import contract details
import { CONTRACTS } from '@/constants/contracts';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';

// Read user's token balance
const { data: tokenBalance } = useReadContract({
  address: sourceTokenAddress,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [address],
});

// Write: Approve tokens
const approveHash = await writeContractAsync({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACTS.LIFI_ROUTER, amountInWei],
});

// Write: Execute swap via LIFIRouter
const swapHash = await writeContractAsync({
  address: CONTRACTS.LIFI_ROUTER,
  abi: LIFI_ABI,
  functionName: isFundBroker ? 'zapToArc' : 'zapToSepolia',
  args: [tokenIn, tokenOut, amountInWei, recipient],
});
```

**Calculations**:
```tsx
// Exchange rates (from TradeXOracle)
const INR_TO_AED_RATE = 0.044;
const AED_TO_INR_RATE = 22.75;
const PLATFORM_FEE = 0.003; // 0.3%

const calculateOutput = () => {
  const inputAmount = parseFloat(amount);
  const rate = isFundBroker ? INR_TO_AED_RATE : AED_TO_INR_RATE;
  const grossOutput = inputAmount * rate;
  const fee = grossOutput * PLATFORM_FEE;
  return (grossOutput - fee).toFixed(2);
};
```

**Visual Design**:
- Glass card effect
- Smooth animations between states
- Clear visual feedback for each step
- Error states should be helpful, not scary

---

### 3. WalletButton Component

**File**: `src/components/WalletButton.tsx`

**Requirements**:
- Use RainbowKit's `ConnectButton` (customizable)
- Show: "Connect Wallet" when disconnected
- Show: Shortened address + network when connected
- ENS name support (if available)
- Custom styling to match TradeX theme

**Example**:
```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        return (
          <button
            onClick={account ? openAccountModal : openConnectModal}
            className="btn-primary"
          >
            {account ? `${account.displayName}` : '🔗 Connect Wallet'}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
```

---

### 4. StatsGrid Component

**File**: `src/components/StatsGrid.tsx`

**Requirements**:
- 4 stat cards in a grid (2x2 on desktop, 1x4 on mobile)
- Each card shows:
  - Icon/emoji
  - Large number (metric)
  - Label
  - Trend indicator (optional)

**Stats to Display**:
1. **Total Value Locked**: $XXX,XXX (can be mock for demo)
2. **24h Volume**: $XX,XXX
3. **Total Swaps**: XXX
4. **Avg Settlement**: 45s

**Design**:
- Glass cards with gradient borders
- Animate numbers on mount (count-up effect)
- Hover effect (subtle lift)

---

### 5. NetworkFlow Component

**File**: `src/components/NetworkFlow.tsx`

**Requirements**:
- Visual diagram showing the swap flow
- Nodes: Sepolia → LI.FI Router → Arc
- Animated lines connecting them
- Highlight active step during swap
- Responsive (stack vertically on mobile)

**Example Structure**:
```tsx
export function NetworkFlow() {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Cross-Chain Flow</h3>
      <div className="flex items-center justify-between">
        {/* Node 1: Sepolia */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-sm mt-2">Sepolia</p>
          <p className="text-xs text-slate-400">INR</p>
        </div>

        {/* Arrow */}
        <div className="flex-1 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-4" />

        {/* Node 2: LI.FI */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-2xl">🔗</span>
          </div>
          <p className="text-sm mt-2">LI.FI</p>
          <p className="text-xs text-slate-400">Bridge</p>
        </div>

        {/* Arrow */}
        <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500 to-emerald-500 mx-4" />

        {/* Node 3: Arc */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-2xl">🔵</span>
          </div>
          <p className="text-sm mt-2">Arc</p>
          <p className="text-xs text-slate-400">AED</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔗 Web3 Integration

### Provider Setup

**File**: `src/providers/Web3Provider.tsx`

```tsx
'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Custom Arc Testnet chain
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.testnet.arc.network' },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: 'TradeX',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [sepolia, arcTestnet],
  transports: {
    [sepolia.id]: http(),
    [arcTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Contract Constants

**File**: `src/constants/contracts.ts`

```tsx
export const CONTRACTS = {
  TRADEX: '0x51720634A94ba904567a64b701007eAD2Fd6E9Ba' as `0x${string}`,
  INR_STABLE: '0x228afECAb39932F0A83EfA03DBAd1dc20E954B7f' as `0x${string}`,
  AED_STABLE: '0x9CE41E2fBCe064734883c7789726Dcc9e358569C' as `0x${string}`,
  YELLOW_ADAPTER: '0x3fD1c3554C0b1F5f4A16FBb48D8F14D1a1f7B9C5' as `0x${string}`,
  LIFI_ROUTER: '0x9847abAbD6B8E64c726BB8c4EB2Fc4939E069194' as `0x${string}`,
};

// ABIs
export const ERC20_ABI = [/* ... */];
export const LIFI_ABI = [/* ... */];
export const TRADEX_ABI = [/* ... */];
```

---

## 🎯 State Management

**Approach**: Use React hooks + Context (no Redux needed for this size)

### Global State Needed:
1. **Wallet Connection** - Handled by wagmi
2. **Swap State** - Local to SwapCard component
3. **Transaction History** - Optional, can use browser localStorage

### Local State Pattern:
```tsx
// In SwapCard.tsx
const [amount, setAmount] = useState('');
const [recipient, setRecipient] = useState('');
const [step, setStep] = useState<SwapStep>('idle');
const [txHash, setTxHash] = useState<string | null>(null);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
```

---

## 📱 Responsive Design

### Breakpoints:
```css
sm: 640px   /* Phones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### Mobile Considerations:
1. **SwapCard**: Full width on mobile, max-w-md on desktop
2. **Hero**: Stack elements vertically on mobile
3. **Stats Grid**: 1 column on mobile, 2x2 on desktop
4. **NetworkFlow**: Vertical layout on mobile
5. **Header**: Hamburger menu if needed

### Touch Targets:
- All buttons: Minimum 44x44px
- Inputs: Larger on mobile (py-4 instead of py-3)

---

## ⚡ Performance Requirements

### Speed Targets:
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s

### Optimization Techniques:

1. **Next.js App Router**:
   - Use Server Components where possible
   - Client Components only for interactive parts

2. **Image Optimization**:
   - Use Next.js `<Image>` component
   - Lazy load images below the fold

3. **Code Splitting**:
   - Dynamic imports for heavy components
   ```tsx
   const HeavyComponent = dynamic(() => import('@/components/Heavy'), {
     loading: () => <Spinner />,
   });
   ```

4. **Bundle Size**:
   - Keep total bundle < 200KB (gzipped)
   - Use tree-shakeable libraries

5. **RPC Calls**:
   - Batch read calls when possible
   - Cache results with React Query
   - Use multicall for multiple contract reads

---

## 🧪 Testing Requirements

### Unit Tests (Optional but recommended):
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**Test Coverage Needed**:
1. SwapCard calculations (exchange rate, fees)
2. Form validation (recipient address)
3. Button state transitions

### Manual Testing Checklist:

**Wallet Connection**:
- [ ] Connect with MetaMask
- [ ] Connect with WalletConnect
- [ ] Switch networks (Sepolia ↔ Arc)
- [ ] Disconnect wallet

**Swap Flow - Fund Broker**:
- [ ] Enter amount, see correct output
- [ ] Click "Max" button
- [ ] Enter recipient address
- [ ] Approve tokens
- [ ] Execute swap
- [ ] See success state
- [ ] View transaction on Etherscan

**Swap Flow - Send Home**:
- [ ] Same as above, but AED → INR

**Edge Cases**:
- [ ] Insufficient balance
- [ ] Invalid recipient address
- [ ] Network switch during swap
- [ ] Rejected transaction
- [ ] Failed transaction

**Responsive**:
- [ ] Test on iPhone (375px)
- [ ] Test on iPad (768px)
- [ ] Test on desktop (1920px)

---

## 🚀 Deployment Requirements

### Environment Variables

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CHAIN_ID=11155111

# Contract Addresses (auto-updated by deployment script)
NEXT_PUBLIC_TRADEX=0x...
NEXT_PUBLIC_LIFI_ROUTER=0x...
NEXT_PUBLIC_INR_STABLE=0x...
NEXT_PUBLIC_AED_STABLE=0x...
```

### Build Commands:
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # Linting
```

### Deployment Platforms:
**Recommended**: Vercel (free, optimized for Next.js)

**Alternative**: Netlify, Railway, or custom hosting

### Pre-deployment Checklist:
- [ ] All contract addresses updated
- [ ] WalletConnect Project ID configured
- [ ] No console.logs in production
- [ ] Favicon and OG image set
- [ ] robots.txt configured
- [ ] Analytics added (optional)
- [ ] Error tracking (Sentry) added (optional)

---

## 🎨 Design Assets Needed

### Icons/Emojis to Use:
```
🌉 - TradeX logo
🏦 - Fund Broker mode
🏠 - Send Home mode
⚡ - Sepolia/Fast
🔗 - LI.FI/Bridge
🔵 - Arc Network
✅ - Success
❌ - Error
⏳ - Loading
💰 - Fees
📊 - Stats
```

### Color Codes Summary:
```
Primary: #6366f1 (Indigo)
Success: #10b981 (Emerald)
Warning: #f59e0b (Amber)
Error: #ef4444 (Red)
Background: #0f172a (Slate 900)
```

---

## 📚 Additional Resources

### Documentation to Read:
1. **wagmi Docs**: https://wagmi.sh/
2. **viem Docs**: https://viem.sh/
3. **RainbowKit Docs**: https://www.rainbowkit.com/
4. **Next.js 15 Docs**: https://nextjs.org/docs
5. **Tailwind CSS**: https://tailwindcss.com/docs

### Example Code:
- Reference existing `SwapCard.tsx` (already implemented)
- Check `Web3Provider.tsx` (already implemented)

### Design Inspiration:
- Uniswap (clean swap interface)
- Aave (professional DeFi UI)
- LI.FI (bridge interface)
- Avoid: Generic templates, plain designs

---

## ⏱️ Development Timeline

**Estimated Timeline**: 3-5 days

### Day 1: Setup & Core
- [ ] Project setup (Next.js + dependencies)
- [ ] Web3 provider configuration
- [ ] Design system implementation
- [ ] Header + Footer components

### Day 2: Main Features
- [ ] SwapCard component (80% of work)
- [ ] Contract integration
- [ ] Transaction flow

### Day 3: Polish
- [ ] StatsGrid component
- [ ] NetworkFlow component
- [ ] Animations & micro-interactions
- [ ] Responsive design

### Day 4: Testing
- [ ] Manual testing all flows
- [ ] Bug fixes
- [ ] Mobile testing
- [ ] Cross-browser testing

### Day 5: Deployment
- [ ] Production build
- [ ] Deploy to Vercel
- [ ] Domain setup (if applicable)
- [ ] Final QA

---

## 🆘 Support & Communication

### Questions to Ask Backend Team:
1. Are contract addresses finalized?
2. Which RPC endpoints to use?
3. Are there any contract function changes?
4. What's the gas estimation for transactions?

### Daily Check-ins:
- Share progress screenshots
- Report blockers immediately
- Test on shared testnet together

---

## ✅ Definition of Done

A feature is complete when:
- [ ] Code is clean and commented
- [ ] TypeScript has no errors
- [ ] Component is responsive (mobile + desktop)
- [ ] Handles loading and error states
- [ ] Tested manually on testnet
- [ ] Looks visually appealing
- [ ] Meets accessibility standards (basic)

---

## 🎯 Success Criteria

The frontend is considered successful when:
1. ✅ A user can complete a swap in under 2 minutes
2. ✅ Visual design gets "wow" reactions
3. ✅ Mobile experience is smooth
4. ✅ All transaction states are clear
5. ✅ Zero confusion about what's happening
6. ✅ Judges are impressed during demo

---

**Questions?** Reference the existing codebase in `frontend/src/` or ask the team!

**Remember**: Make it beautiful, make it fast, make it simple. Users should feel confident, not confused. 🚀
