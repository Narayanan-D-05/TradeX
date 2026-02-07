/**
 * Analyze failed liquidity transaction
 */

const { ethers } = require("hardhat");

const TX_HASH = "0xf96286818f202048af0d9a707a81c66ebb67dff4ba9d2739c0c478acee90a64a";

async function main() {
  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  console.log("\n🔍 Analyzing Transaction");
  console.log("=".repeat(60));

  const tx = await provider.getTransaction(TX_HASH);
  const receipt = await provider.getTransactionReceipt(TX_HASH);

  console.log("Transaction:", TX_HASH);
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("From:", tx.from);
  console.log("To:", tx.to);

  // Try to get revert reason
  try {
    await provider.call(tx, receipt.blockNumber);
  } catch (error) {
    console.log("\n❌ Revert Reason:");
    console.log(error.message);
    
    if (error.data) {
      console.log("\nError Data:", error.data);
      
      // Try to decode
      try {
        const decoded = ethers.toUtf8String("0x" + error.data.slice(138));
        console.log("Decoded:", decoded);
      } catch (e) {
        console.log("Could not decode error data");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
