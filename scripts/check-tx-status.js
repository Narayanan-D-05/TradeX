const { ethers } = require('hardhat');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  const txHash = '0xccca0e9c3a2bed0f608bb2007b460210aa4baf99f7a19124619aeebf54c72036';
  
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log('Transaction:', txHash);
  console.log('Status:', receipt.status);
  console.log('Status === 1 (success)?', receipt.status === 1);
  console.log('Status === 0 (failed)?', receipt.status === 0);  
  console.log('Logs:', receipt.logs.length);
  
  if (receipt.status === 0) {
    console.log('\n❌ TRANSACTION FAILED (REVERTED)');
  } else {
    console.log('\n✅ Transaction succeeded');
    console.log('Events:', receipt.logs.length);
  }
}

main();
