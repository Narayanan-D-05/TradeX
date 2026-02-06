'use client';

import { useState } from 'react';
import { CircleSwapCard } from '@/components/CircleSwapCard';

/**
 * Circle Gateway Demo Page for TradeX Competition
 * 
 * Showcases Circle Tools Integration:
 * - Cross-chain USDC transfers 
 * - Arc network integration
 * - Programmable wallets
 * - Circle Gateway API
 */

export default function CircleGatewayDemo() {
  const [activeTab, setActiveTab] = useState<'demo' | 'architecture' | 'docs'>('demo');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">TradeX × Circle Gateway</h1>
              <p className="text-gray-400">Cross-border payments powered by Circle tools</p>
            </div>
          </div>
          
          {/* Circle Tools Badge */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/50">
              ✓ Circle Gateway
            </span>
            <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/50">
              ✓ USDC Cross-Chain
            </span>
            <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/50">
              ✓ Arc Network
            </span>
            <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm border border-purple-700/50">
              ✓ Programmable Wallets
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'demo' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Live Demo
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'architecture' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'docs' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Documentation
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'demo' && <DemoSection />}
        {activeTab === 'architecture' && <ArchitectureSection />}
        {activeTab === 'docs' && <DocumentationSection />}
      </div>
    </div>
  );
}

function DemoSection() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Experience Circle Gateway Integration</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Send money across borders instantly using Circle's USDC infrastructure and Arc network.
          No traditional banking delays, minimal fees, programmable transactions.
        </p>
      </div>

      {/* Use Cases */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Fund Broker */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-blue-400">Fund DFM Broker (INR → AED)</h3>
          <p className="text-gray-400 text-sm">
            Convert Indian Rupees to UAE Dirhams for funding your Dubai Financial Market broker account.
            Uses Circle Gateway for instant USDC bridging from Ethereum Sepolia to Arc network.
          </p>
          <CircleSwapCard mode="fundBroker" />
        </div>

        {/* Send Home */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-purple-400">Send Money Home (AED → INR)</h3>
          <p className="text-gray-400 text-sm">
            Transfer money from UAE back to India. Circle Gateway ensures fast settlement
            from Arc network to Ethereum Sepolia, converted to Indian Rupees.
          </p>
          <CircleSwapCard mode="sendHome" />
        </div>
      </div>

      {/* Circle Tools Features */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-4">Circle Tools Integration Features</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">🔵</div>
            <h4 className="font-medium">Circle Gateway API</h4>
            <p className="text-gray-400 text-sm">
              Cross-chain USDC transfers with programmable message passing and atomic settlement.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm">💰</div>
            <h4 className="font-medium">USDC Infrastructure</h4>
            <p className="text-gray-400 text-sm">
              Native USDC support on both networks with 6-decimal precision matching Circle standards.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm">🏗️</div>
            <h4 className="font-medium">Arc Network</h4>
            <p className="text-gray-400 text-sm">
              Specialized blockchain for financial applications with USDC as native gas token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">TradeX × Circle Gateway Architecture</h2>
        <p className="text-gray-400 text-lg">
          Complete integration utilizing Circle's developer tools and Arc network
        </p>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h3 className="text-xl font-semibold mb-6">System Architecture</h3>
        
        <div className="space-y-12">
          {/* Frontend Layer */}
          <div>
            <h4 className="text-blue-400 font-medium mb-4">Frontend Layer</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-blue-700/30">
                <div className="font-medium text-blue-300">React + TypeScript</div>
                <div className="text-sm text-gray-400 mt-1">Circle Gateway SDK integration</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-blue-700/30">
                <div className="font-medium text-blue-300">Wagmi + Viem</div>
                <div className="text-sm text-gray-400 mt-1">Multi-chain wallet connectivity</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-blue-700/30">
                <div className="font-medium text-blue-300">Circle API Client</div>
                <div className="text-sm text-gray-400 mt-1">Cross-chain transfer management</div>
              </div>
            </div>
          </div>

          {/* Smart Contract Layer */}
          <div>
            <h4 className="text-green-400 font-medium mb-4">Smart Contract Layer</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-green-700/30">
                <div className="font-medium text-green-300">CircleArcGateway.sol</div>
                <div className="text-sm text-gray-400 mt-2">
                  • Circle Gateway message handling<br />
                  • USDC → INR/AED conversion<br />
                  • Cross-chain transfer initiation<br />
                  • Liquidity pool management
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-green-700/30">
                <div className="font-medium text-green-300">MockERC20 Tokens</div>
                <div className="text-sm text-gray-400 mt-2">
                  • INR Stable (6 decimals)<br />
                  • AED Stable (6 decimals)<br />
                  • USDC (Circle standard)<br />
                  • Circle Gateway compatible
                </div>
              </div>
            </div>
          </div>

          {/* Network Layer */}
          <div>
            <h4 className="text-purple-400 font-medium mb-4">Network Infrastructure</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-purple-700/30">
                  <div className="font-medium text-purple-300">Ethereum Sepolia</div>
                  <div className="text-sm text-gray-400 mt-2">
                    • Source chain for INR operations<br />
                    • Circle USDC deployment<br />
                    • Gateway message origin<br />
                    • Programmable wallet support
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-purple-700/30">
                  <div className="font-medium text-purple-300">Arc Testnet</div>
                  <div className="text-sm text-gray-400 mt-2">
                    • Destination for AED operations<br />
                    • USDC as native gas token<br />
                    • Financial application focus<br />
                    • Circle Gateway compatible
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Circle Tools Integration */}
          <div>
            <h4 className="text-orange-400 font-medium mb-4">Circle Tools Integration</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-orange-700/30 text-center">
                <div className="text-2xl mb-2">🔵</div>
                <div className="font-medium text-orange-300">Circle Gateway</div>
                <div className="text-xs text-gray-400 mt-1">Cross-chain messaging</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-orange-700/30 text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium text-orange-300">USDC</div>
                <div className="text-xs text-gray-400 mt-1">Native token bridge</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-orange-700/30 text-center">
                <div className="text-2xl mb-2">🏗️</div>
                <div className="font-medium text-orange-300">Arc Network</div>
                <div className="text-xs text-gray-400 mt-1">Financial blockchain</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-orange-700/30 text-center">
                <div className="text-2xl mb-2">🔧</div>
                <div className="font-medium text-orange-300">Programmable</div>
                <div className="text-xs text-gray-400 mt-1">Smart contract wallets</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Flow */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h3 className="text-xl font-semibold mb-6">Transaction Flow: INR → AED via Circle Gateway</h3>
        
        <div className="space-y-6">
          {[
            {
              step: 1,
              title: "User Initiates Transfer",
              description: "Frontend calls CircleArcGateway contract on Sepolia with INR amount and recipient",
              color: "blue"
            },
            {
              step: 2,
              title: "INR → USDC Conversion",
              description: "Smart contract converts INR stablecoin to USDC using on-chain exchange rate",
              color: "green"
            },
            {
              step: 3,
              title: "Circle Gateway Transfer",
              description: "Contract initiates cross-chain USDC transfer via Circle Gateway API to Arc network",
              color: "purple"
            },
            {
              step: 4,
              title: "Arc Network Receipt",
              description: "USDC arrives on Arc network, CircleArcGateway handles the cross-chain message",
              color: "orange"
            },
            {
              step: 5,
              title: "USDC → AED Conversion",
              description: "Arc gateway converts USDC to AED stablecoin and transfers to recipient",
              color: "pink"
            }
          ].map((item, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-${item.color}-600`}>
                {item.step}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{item.title}</div>
                <div className="text-sm text-gray-400 mt-1">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentationSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Technical Documentation</h2>
        <p className="text-gray-400 text-lg">
          Implementation details and Circle tools integration guide
        </p>
      </div>

      {/* Circle Tools Requirements */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h3 className="text-xl font-semibold mb-6">Circle Tools Requirements Compliance</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-green-400 font-medium mb-3">✅ REQUIRED TOOLS</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <div className="font-medium text-green-300">Circle Gateway</div>
                <div className="text-sm text-gray-400 mt-1">
                  Integrated for cross-chain USDC transfers between Sepolia and Arc networks
                </div>
              </div>
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <div className="font-medium text-green-300">USDC</div>
                <div className="text-sm text-gray-400 mt-1">
                  Primary bridging token with 6-decimal precision, deployed on both networks
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-blue-400 font-medium mb-3">🔵 RECOMMENDED TOOLS</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <div className="font-medium text-blue-300">Circle Wallets</div>
                <div className="text-sm text-gray-400 mt-1">
                  Programmable wallet integration ready for enhanced user experience
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <div className="font-medium text-blue-300">Arc Network</div>
                <div className="text-sm text-gray-400 mt-1">
                  Financial blockchain with native USDC support and specialized tooling
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Integration */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h3 className="text-xl font-semibold mb-6">Circle Gateway API Integration</h3>
        
        <div className="space-y-4">
          <pre className="bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
            <code className="text-green-400">{`// Circle Gateway Transfer Example
const transferResult = await circleGateway.transferCrossChain({
  amount: "100.000000", // USDC (6 decimals)
  fromChain: 11155111,   // Ethereum Sepolia
  toChain: 111551119,    // Arc Testnet
  recipient: "0x...",
  sourceToken: "0xA3B1D2c5E2360728bBa25d7Bf9d6CaCCCE280110",
  destinationToken: "0xA3B1D2c5E2360728bBa25d7Bf9d6CaCCCE280110"
});`}</code>
          </pre>
          
          <pre className="bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
            <code className="text-blue-400">{`// Smart Contract Integration
function initiateCircleTransfer(
    address recipient,
    uint256 amount,
    uint256 destinationChain
) external returns (bytes32 transferId) {
    // Convert stablecoin to USDC
    uint256 usdcAmount = convertToUSDC(msg.sender, amount);
    
    // Initiate Circle Gateway transfer
    transferId = _initiateCircleTransfer(
        recipient, 
        usdcAmount, 
        destinationChain
    );
}`}</code>
          </pre>
        </div>
      </div>

      {/* Competition Features */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h3 className="text-xl font-semibold mb-6">Competition Submission Features</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-yellow-400 font-medium mb-3">📋 Deliverables</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>✅ Functional MVP with frontend & backend</li>
              <li>✅ Architecture diagram and documentation</li>
              <li>✅ Circle Gateway API integration</li>
              <li>✅ USDC cross-chain transfers</li>
              <li>✅ Arc network implementation</li>
              <li>📹 Video demonstration (coming soon)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-pink-400 font-medium mb-3">🚀 Unique Features</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Cross-border payment corridor (India ↔ UAE)</li>
              <li>• Real-world use case (broker funding)</li>
              <li>• Multi-stablecoin support (INR, AED, USDC)</li>
              <li>• Circle tools integration showcase</li>
              <li>• Production-ready smart contracts</li>
              <li>• User-friendly interface</li>
            </ul>
          </div>
        </div>
      </div>

      {/* GitHub Repository */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <h3 className="text-xl font-semibold mb-4">GitHub Repository</h3>
        <p className="text-gray-400 mb-6">
          Complete source code with Circle tools integration and documentation
        </p>
        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm">
          <span className="text-blue-400">https://github.com/your-repo/tradex-circle-gateway</span>
        </div>
      </div>
    </div>
  );
}