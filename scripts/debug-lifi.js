const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Deep Debug LI.FI Router...\n");

    const [deployer] = await hre.ethers.getSigners();

    // Load deployment file
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contracts = deployment.contracts;

    const router = await hre.ethers.getContractAt("LIFIRouter", contracts.LIFI_ROUTER);
    const inrToken = await hre.ethers.getContractAt("MockERC20", contracts.INR_STABLE);

    console.log("Contract addresses:");
    console.log("  Router:", contracts.LIFI_ROUTER);
    console.log("  INR:", contracts.INR_STABLE);
    console.log("  AED:", contracts.AED_STABLE);

    // Check all conditions that could cause revert
    console.log("\n🔍 Checking revert conditions:");

    // 1. Token support
    const inrSupported = await router.supportedTokens(contracts.INR_STABLE);
    console.log("1. INR token supported:", inrSupported);

    // 2. Route active - check both ways
    const SEPOLIA = 11155111n;
    const ARC = 5042002n;

    // Compute route key the same way contract does
    const routeKey = hre.ethers.solidityPackedKeccak256(
        ["uint256", "uint256"],
        [SEPOLIA, ARC]
    );
    console.log("2. Route key (Sepolia->Arc):", routeKey);

    const route = await router.getRoute(SEPOLIA, ARC);
    console.log("   Route details:", {
        srcChainId: route.srcChainId.toString(),
        dstChainId: route.dstChainId.toString(),
        active: route.active,
        fee: route.fee.toString()
    });

    const isActive = await router.isRouteActive(SEPOLIA, ARC);
    console.log("   Is route active:", isActive);

    // 3. Check token balance
    const balance = await inrToken.balanceOf(deployer.address);
    console.log("3. User INR balance:", hre.ethers.formatEther(balance));

    // 4. Check allowance
    const allowance = await inrToken.allowance(deployer.address, contracts.LIFI_ROUTER);
    console.log("4. INR allowance to router:", hre.ethers.formatEther(allowance));

    // 5. Try to simulate the call
    console.log("\n🧪 Simulating zapToArc call...");
    try {
        const testAmount = hre.ethers.parseEther("10");

        // First approve if needed
        if (allowance < testAmount) {
            console.log("   Approving tokens first...");
            const approveTx = await inrToken.approve(contracts.LIFI_ROUTER, testAmount);
            await approveTx.wait();
            console.log("   ✅ Approved");
        }

        // Try static call (simulation)
        const result = await router.zapToArc.staticCall(
            contracts.INR_STABLE,
            contracts.AED_STABLE,
            testAmount,
            deployer.address
        );
        console.log("   ✅ Simulation succeeded! ZapId:", result);
    } catch (error) {
        console.log("   ❌ Simulation failed:", error.message);

        // Try to decode the error
        if (error.data) {
            console.log("   Error data:", error.data);
        }
    }

    console.log("\n✅ Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
