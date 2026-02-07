/**
 * Check available Uniswap V4 contracts on Base Sepolia
 */

const { ethers } = require("hardhat");

const KNOWN_V4_CONTRACTS = {
  PoolManager: "0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829",
  PositionManager: "0x1B1C77B606d13b09C84d1c7394B96b147bC03147", // Common V4 address
  SwapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", // Common V4 address
  PoolModifyLiquidityTest: "0xD44D04eCec4F4f46fab3a492a0E2933bdA3C5Cbd", // Test helper
};

async function main() {
  console.log("\n🔍 Checking Uniswap V4 Contracts on Base Sepolia");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  for (const [name, address] of Object.entries(KNOWN_V4_CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      const exists = code !== "0x";
      
      console.log(`\n${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Status: ${exists ? "✅ Deployed" : "❌ Not found"}`);
      
      if (exists) {
        console.log(`  Code size: ${(code.length - 2) / 2} bytes`);
      }
    } catch (error) {
      console.log(`  Error checking: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
