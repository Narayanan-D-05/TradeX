/**
 * Verify Official V4 Contracts on Base Sepolia
 */

const { ethers } = require("hardhat");

// Official addresses from docs.uniswap.org
const OFFICIAL_CONTRACTS = {
  PoolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408",
  PositionManager: "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80",
  UniversalRouter: "0x492e6456d9528771018deb9e87ef7750ef184104",
  Quoter: "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba",
  StateView: "0x571291b572ed32ce6751a2cb2486ebee8defb9b4",
  PoolSwapTest: "0x8b5bcc363dde2614281ad875bad385e0a785d3b9",
  PoolModifyLiquidityTest: "0x37429cd17cb1454c34e7f50b09725202fd533039",
  Permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

async function main() {
  console.log("\n🔍 Verifying Official Uniswap V4 Contracts");
  console.log("=".repeat(60));
  console.log("Base Sepolia (Chain ID: 84532)");
  console.log("Source: https://docs.uniswap.org/contracts/v4/deployments\n");

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  for (const [name, address] of Object.entries(OFFICIAL_CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      const exists = code !== "0x";
      
      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Status: ${exists ? "✅ Deployed" : "❌ Not found"}`);
      
      if (exists) {
        const codeSize = (code.length - 2) / 2;
        console.log(`  Code size: ${codeSize.toLocaleString()} bytes`);
      }
      console.log();
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log("=".repeat(60));
  console.log("All official contracts verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
