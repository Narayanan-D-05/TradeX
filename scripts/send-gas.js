const { ethers } = require("hardhat");

async function main() {
    // Get the address from command line arguments
    const recipient = process.env.RECIPIENT || process.argv[2];

    if (!recipient) {
        console.error("❌ Please provide a recipient address!");
        console.error("Usage: npx hardhat run scripts/send-gas.js --network arc <YOUR_WALLET_ADDRESS>");
        process.exit(1);
    }

    const [sender] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(sender.address);

    console.log(`\n⛽ Sending Gas (USDC) on Arc Testnet`);
    console.log(`----------------------------------------`);
    console.log(`From:    ${sender.address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} USDC`);
    console.log(`To:      ${recipient}`);

    // Amount to send (e.g., 5 USDC)
    const amountToSend = ethers.parseEther("5.0");

    if (balance < amountToSend) {
        console.error("\n❌ Insufficient funds in deployer wallet!");
        process.exit(1);
    }

    console.log(`\n💸 Sending ${ethers.formatEther(amountToSend)} USDC...`);

    const tx = await sender.sendTransaction({
        to: recipient,
        value: amountToSend
    });

    console.log(`✅ Transaction sent! Hash: ${tx.hash}`);
    await tx.wait();
    console.log(`🎉 Transfer confirmed!`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
