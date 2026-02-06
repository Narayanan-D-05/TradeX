const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🪙 Minting tokens for all test users...\n");

    const [deployer] = await hre.ethers.getSigners();

    // Load deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contracts = deployment.contracts;

    const inrToken = await hre.ethers.getContractAt("MockERC20", contracts.INR_STABLE);
    const aedToken = await hre.ethers.getContractAt("MockERC20", contracts.AED_STABLE);

    console.log("Deployer address:", deployer.address);
    console.log("INR Token:", contracts.INR_STABLE);
    console.log("AED Token:", contracts.AED_STABLE);

    // Mint tokens using the public mint function
    const mintAmount = hre.ethers.parseUnits("100000", 6);

    console.log("\n📤 Minting 100,000 INR to deployer...");
    try {
        // Try mint function (if available on MockERC20)
        const tx1 = await inrToken.mint(deployer.address, mintAmount);
        await tx1.wait();
        console.log("✅ INR minted");
    } catch (e) {
        console.log("⚠️ Direct mint failed, trying faucet...");
        try {
            const tx = await inrToken.faucet();
            await tx.wait();
            console.log("✅ INR faucet used");
        } catch (e2) {
            console.log("❌ Both failed:", e2.message);
        }
    }

    console.log("\n📤 Minting 100,000 AED to deployer...");
    try {
        const tx2 = await aedToken.mint(deployer.address, mintAmount);
        await tx2.wait();
        console.log("✅ AED minted");
    } catch (e) {
        console.log("⚠️ Direct mint failed, trying faucet...");
        try {
            const tx = await aedToken.faucet();
            await tx.wait();
            console.log("✅ AED faucet used");
        } catch (e2) {
            console.log("❌ Both failed:", e2.message);
        }
    }

    // Check final balances
    console.log("\n💰 Final Balances:");
    const inrBal = await inrToken.balanceOf(deployer.address);
    const aedBal = await aedToken.balanceOf(deployer.address);
    console.log("  INR:", hre.ethers.formatUnits(inrBal, 6));
    console.log("  AED:", hre.ethers.formatUnits(aedBal, 6));

    // Pre-approve router for convenience
    console.log("\n🔓 Pre-approving LIFI Router...");
    const maxApproval = hre.ethers.MaxUint256;

    const tx3 = await inrToken.approve(contracts.LIFI_ROUTER, maxApproval);
    await tx3.wait();
    console.log("✅ INR approved for LIFI Router");

    const tx4 = await aedToken.approve(contracts.LIFI_ROUTER, maxApproval);
    await tx4.wait();
    console.log("✅ AED approved for LIFI Router");

    console.log("\n🎉 Setup complete! You can now use the swap.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
