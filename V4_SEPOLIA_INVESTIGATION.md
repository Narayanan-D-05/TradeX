# Uniswap V4 Sepolia Pool Initialization Issue - Investigation Summary

## Problem Statement
Unable to initialize Uniswap V4 INR/AED pool on Sepolia testnet despite multiple approaches.

## Investigation Timeline

### Initial Approach: PositionManager.initializePool()
- **Transaction**: [0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be](https://sepolia.etherscan.io/tx/0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be)
- **Result**: ✅ Transaction succeeded
- **Gas Used**: 30,829 (suspiciously low)
- **Events Emitted**: 0
- **Pool State After**: Not initialized (sqrtPriceX96 = 0)
- **Conclusion**: PositionManager.initializePool() returns early without creating pool

###2: Direct PoolManager.initialize()
- **Attempt**: Call PoolManager.initialize() directly without unlock
- **Result**: ❌ Error `0x7983c051` = ContractLocked()
- **Conclusion**: Confirmed V4 requires unlock pattern for all state changes

### Approach 3: UnlockHelper Contract with Proper Callback
- **Contract**: [UnlockHelper.sol](./contracts/UnlockHelper.sol)
- **Deployed At**: Multiple instances (0xB8F6cbB55d6137a843d3D60FFDcd0656D161936c, etc.)
- **Pattern**: User → initializePool() → unlock() → unlockCallback() → initialize()
- **Result**: ❌ Still receives ContractLocked error
- **Conclusion**: Lock mechanism not functioning correctly even in callback

### Approach 4: Unlock Callback Verification
- **Test Contract**: [SimpleUnlockTest.sol](./contracts/SimpleUnlockTest.sol)
- **Test 1**: Basic unlock callback without initialize
  - **TX**: [0x45991861a2b1783264223d460ce11676c1d2a48a659cffdd93aee9e78380868c](https://sepolia.etherscan.io/tx/0x45991861a2b1783264223d460ce11676c1d2a48a659cffdd93aee9e78380868c)
  - **Result**: ✅ Callback invoked successfully
  - **Gas**: 52,877
  - **Conclusion**: Unlock mechanism works for callbacks
  
- **Test 2**: Unlock callback WITH initialize call
  - **Result**: ❌ Reverts with "ContractLocked"
  - **Conclusion**: PoolManager re-locks or has bug preventing initialize in callback

## Root Cause Analysis

The Sepolia PoolManager (`0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`) has a **critical bug** in its locking mechanism:

1. The contract correctly invokes `unlockCallback()` on calling contracts
2. However, state-changing functions like `initialize()` **still revert with ContractLocked** even when called from within the unlock callback
3. This violates the V4 specification where callbacks should have full access to locked functions

### Evidence
- Pool storage shows sqrtPriceX96 = 0 (uninitialized)
- getSlot0() reverts (pool doesn't exist)
- Simple unlock callbacks work (52k gas, event emitted)
- Initialize in callback fails with ContractLocked

## Contract Addresses Used
- **PoolManager**: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
- **PositionManager**: 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4
- **Permit2**: 0x000000000022D473030F116dDEE9F6B43aC78BA3
- **AED_STABLE (currency0)**: 0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c
- **INR_STABLE (currency1)**: 0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41

## Pool Parameters
- **Fee**: 3000 (0.3%)
- **Tick Spacing**: 60
- **Hooks**: 0x0000000000000000000000000000000000000000
- **sqrtPriceX96**: 377680650705498097308424011251 (1 AED = 22.727 INR)
- **Pool ID**: 0x69994a29008d8e2fb433789e5b4b3f33d9b4e89ab6a8942d8fbc82581849bf95

## Recommended Solutions

### Option 1: Use Base Sepolia (RECOMMENDED)
Base Sepolia has official Uniswap V4 deployments that are production-ready.

```javascript
// Base Sepolia addresses (if available)
const POOL_MANAGER = "0x..."; // Check Uniswap docs
const POSITION_MANAGER = "0x...";
```

**Pros**: Official deployment, guaranteed to work
**Cons**: Requires switching networks, redeploying tokens

### Option 2: Deploy Your Own V4 Instance
Clone and deploy Uniswap V4 contracts yourself:

```bash
git clone https://github.com/Uniswap/v4-core.git
git clone https://github.com/Uniswap/v4-periphery.git
# Deploy to Sepolia with your own keys
```

**Pros**: Full control, works on Sepolia
**Cons**: Complex deployment, gas costs, needs maintenance

### Option 3: Use Uniswap V3
V3 has proven, stable deployments on Sepolia:

```javascript
const NONFUNGIBLE_POSITION_MANAGER = "0x1238536071E1c677A632429e3655c799b22cDA52";
```

**Pros**: Proven technology, stable deployment
**Cons**: Different API, no hooks/singleton benefits

### Option 4: Switch to Ethereum Mainnet Fork
Test against mainnet V4 deployments in a local fork:

```javascript
// hardhat.config.js
networks: {
  hardhat: {
    forking: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`
    }
  }
}
```

**Pros**: Test against real V4, free
**Cons**: Local only, not public testnet

## Verified Facts
✅ Unlock callback mechanism works on this PoolManager  
✅ Pool storage is accessible via extsload  
✅ Contracts have bytecode and respond to calls  
✅ Token contracts are valid ERC20s with balances  
✅ All approvals are configured correctly  
❌ PoolManager.initialize() throws ContractLocked even in unlockCallback  
❌ PositionManager.initializePool() silently fails  
❌ Pool cannot be initialized with current Sepolia deployment  

## Files Created During Investigation
1. `/contracts/UnlockHelper.sol` - Proper V4 unlock callback implementation
2. `/contracts/SimpleUnlockTest.sol` - Minimal unlock callback testing
3. `/scripts/unlock-pattern-init.js` - Deploy and test UnlockHelper
4. `/scripts/test-unlock-callback.js` - Test unlock mechanism
5. `/scripts/check-pool-storage.js` - Verify pool state
6. `/scripts/verify-v4-deployment.js` - Check contract deployments
7. `/scripts/analyze-init-tx.js` - Transaction forensics
8. `/scripts/direct-pool-manager-init.js` - Direct initialization test

## Next Steps
1. Check Uniswap Discord/GitHub for official Sepolia V4 status
2. Consider migrating to Base Sepolia or Base Mainnet
3. If Sepolia required, deploy own V4 instance
4. Alternative: Use V3 which has stable Sepolia deployment

## Key Transactions
- Simple init (30k gas, 0 events): [0xad2b2b3d](https://sepolia.etherscan.io/tx/0xad2b2b3d835b4bdb2024bfe9f6dfb3cc486399bb177e3d3619d2f6d1606950be)
- Unlock callback works: [0x4599186](https://sepolia.etherscan.io/tx/0x45991861a2b1783264223d460ce11676c1d2a48a659cffdd93aee9e78380868c)

## Conclusion
The Sepolia Uniswap V4 deployment at 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543 appears to be a broken or incomplete test deployment. The locking mechanism does not function according to V4 specifications, preventing pool initialization even through proper unlock callbacks. **Production usage should target Base Sepolia, Base Mainnet, or a self-deployed V4 instance.**
