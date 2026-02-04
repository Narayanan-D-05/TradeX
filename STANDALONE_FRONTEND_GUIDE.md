# Using the Standalone HTML Frontend

## Overview

You've provided a beautiful standalone HTML frontend that's ready to use! Here's how to integrate it with your TradeX project.

## Quick Start

### Option 1: Use as Standalone Demo (Easiest)

1. **Save the HTML file**:
```bash
# Save your HTML as demo.html in the project root
cp your-frontend.html c:/Users/dnara/Desktop/Projects/TradeX/demo.html
```

2. **Open in browser**:
```bash
# Simply double-click demo.html or open it with:
start demo.html
```

That's it! The frontend will work immediately with wallet connection.

### Option 2: Integrate with Next.js Frontend

Since you already have a Next.js frontend, here's how to use the components:

1. **Copy the styles to `globals.css`**:
```css
/* Add the gradient and animation styles to frontend/src/app/globals.css */
```

2. **Use the components**:
- The SwapCard logic can be added to your existing `SwapCard.tsx`
- The animations can be integrated with framer-motion
- The design system matches what's already in your project

##  What's Included in the HTML Frontend

✅ **Beautiful UI Components**:
- Particle background animation
- Glassmorphism cards
- Neon glow effects
- Smooth animations (Framer Motion)
- Gradient text and borders

✅ **Full Swap Interface**:
- Mode switcher (Fund Broker / Send Home)
- Input/output fields
- Fee breakdown
- Transaction states (idle, approving, swapping, success)
- Recipient address input

✅ **Web3 Integration** (needs completion):
- Wallet connection via MetaMask
- Ethers.js integration
- Contract ABIs included
- Network detection

✅ **Additional Features**:
- Stats grid with animated counters
- Network flow visualization
- Use cases section
- Sponsors section
- Mobile responsive

## Adding Full Web3 Functionality

The HTML has basic Web3 setup. To complete it:

### 1. Update Contract Integration in the HTML

Replace the `// ... (Include all other components)` section with the full SwapCard from your Next.js app:

```javascript
// Inside the HTML <script type="text/babel">

// Swap Card with Full Web3
const SwapCard = ({ walletConnected, signer, provider, chainId }) => {
    const [mode, setMode] = useState('fundBroker');
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [step, setStep] = useState('idle');
    const [balance, setBalance] = useState('0');
    const [txHash, setTxHash] = useState('');
    
    const isFundBroker = mode === 'fundBroker';
    const sourceToken = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;
    const destToken = isFundBroker ? CONTRACTS.AED_STABLE : CONTRACTS.INR_STABLE;
    
    // Load balance
    useEffect(() => {
        if (walletConnected && provider) {
            loadBalance();
        }
    }, [walletConnected, provider, mode]);
    
    const loadBalance = async () => {
        try {
            const tokenContract = new ethers.Contract(sourceToken, ERC20_ABI, provider);
            const bal = await tokenContract.balanceOf(await signer.getAddress());
            setBalance(ethers.utils.formatEther(bal));
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    };
    
    const handleSwap = async () => {
        if (!walletConnected || !amount || !recipient) return;
        
        try {
            setStep('approving');
            
            // Step 1: Approve tokens
            const tokenContract = new ethers.Contract(sourceToken, ERC20_ABI, signer);
            const amountWei = ethers.utils.parseEther(amount);
            
            const approveTx = await tokenContract.approve(CONTRACTS.LIFI_ROUTER, amountWei);
            await approveTx.wait();
            
            setStep('swapping');
            
            // Step 2: Execute swap
            const lifiContract = new ethers.Contract(CONTRACTS.LIFI_ROUTER, LIFI_ABI, signer);
            const swapFunction = isFundBroker ? 'zapToArc' : 'zapToSepolia';
            
            const swapTx = await lifiContract[swapFunction](
                sourceToken,
                destToken,
                amountWei,
                recipient
            );
            
            const receipt = await swapTx.wait();
            setTxHash(receipt.transactionHash);
            setStep('success');
            
            // Reload balance
            await loadBalance();
        } catch (error) {
            console.error('Swap failed:', error);
            setStep('error');
            alert(`Swap failed: ${error.message}`);
        }
    };
    
    const handleFaucet = async () => {
        try {
            const tokenContract = new ethers.Contract(sourceToken, ERC20_ABI, signer);
            const tx = await tokenContract.faucet();
            await tx.wait();
            alert('Minted 10,000 test tokens!');
            await loadBalance();
        } catch (error) {
            console.error('Faucet failed:', error);
            alert(`Faucet failed: ${error.message}`);
        }
    };
    
    // ... rest of SwapCard UI ...
};
```

### 2. Network Switching

Add functionality to switch networks:

```javascript
const switchNetwork = async (targetChainId) => {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
    } catch (error) {
        if (error.code === 4902) {
            // Network not added, add it
            if (targetChainId === CHAIN_IDS.ARC) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x4CF652',
                        chainName: 'Arc Testnet',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://rpc.testnet.arc.network'],
                        blockExplorerUrls: ['https://explorer.testnet.arc.network']
                    }]
                });
            }
        }
    }
};
```

## Recommended Deployment Options

### Option A: GitHub Pages (Static Hosting)

1. **Rename to index.html**:
```bash
mv demo.html index.html
```

2. **Push to GitHub**:
```bash
git add index.html
git commit -m "Add standalone HTML frontend"
git push origin main
```

3. **Enable GitHub Pages**:
- Go to repository Settings → Pages
- Source: Deploy from main branch
- Select `/` (root)
- Your app will be live at: `https://narayanan-d-05.github.io/TradeX/`

### Option B: Vercel (Recommended)

1. **Create vercel.json**:
```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" }
  ]
}
```

2. **Deploy**:
```bash
vercel --prod
```

### Option C Keep Next.js, Use Design

Use the design patterns from the HTML in your Next.js app:

1. Copy the CSS styles to `globals.css`
2. Use the component structure in your React components
3. Keep the Web3 integration from wagmi
4. Best of both worlds!

## File Structure

If using standalone HTML:

```
TradeX/
├── index.html              # Your beautiful frontend
├── README.md               # Project documentation
├── contracts/              # Smart contracts
├── scripts/                # Deployment & settlement scripts
└── frontend/               # Next.js (optional, keep for reference)
```

## Testing the Frontend

### 1. Open Locally

```bash
# Method 1: Direct open
start demo.html

# Method 2: Local server (recommended)
npx serve .
# Or
python -m http.server 8000
```

### 2. Connect Wallet

1. Click "Connect Wallet"
2. Approve MetaMask connection
3. Switch to Sepolia or Arc Testnet

### 3. Get Test Tokens

Click "Need test tokens? Get from Faucet" button

### 4. Try a Swap

1. Enter amount (e.g., 1000)
2. Enter recipient address
3. Click "Fund Broker" or "Send Home"
4. Approve in MetaMask
5. Wait for confirmation

## Advantages of This Approach

✅ **No Build Step**: Just open and works
✅ **Fast Loading**: Everything from CDN
✅ **Beautiful UI**: Premium design ready
✅ **Easy Deployment**: Deploy anywhere
✅ **No Dependencies**: Self-contained
✅ **Mobile Responsive**: Works on all devices

## Disadvantages

❌ **No TypeScript**: JavaScript only
❌ **CDN Dependencies**: Requires internet
❌ **Limited SEO**: Client-side only
❌ **No SSR**: Slower initial load vs Next.js

## My Recommendation

### For Hackathon Demo:

**Use the standalone HTML!**

Reasons:
1. ✅ It's complete and beautiful
2. ✅ Fast to deploy
3. ✅ Easy to demo
4. ✅ Works immediately
5. ✅ Judges will love the UI

### For Production:

**Migrate to Next.js later**

The Next.js version gives you:
- Better performance (SSR)
- TypeScript safety
- Better SEO
- More control

## Next Steps

1. **Save the HTML file** as `index.html` in project root
2. **Test locally** by opening in browser
3. **Deploy to GitHub Pages** or Vercel
4. **Connect wallet** and test the swap
5. **Run settlement service** for cross-chain swaps:
   ```bash
   node scripts/settle-cross-chain.js
   ```

## Troubleshooting

### Wallet Won't Connect
- Make sure MetaMask is installed
- Check you're on Sepolia or Arc network
- Try refreshing the page

### Transaction Fails
- Check you have enough ETH for gas
- Verify you're on the correct network
- Check contract addresses are correct

### Tokens Not Appearing
- Run the settlement service
- Wait for cross-chain confirmation
- Check you're looking at the destination network

## Support

Questions? Check:
- `SETTLEMENT_FIX.md` - Settlement issues
- `FRONTEND_REQUIREMENTS.md` - Technical specs
- `README.md` - General overview

---

**Ready to use! Just open the HTML file and start swapping! 🚀**
