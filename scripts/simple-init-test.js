const { ethers } = require("hardhat");

const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

function calculateSqrtPriceX96() {
    const sqrtPrice = 4.767; // sqrt(22.727)
    const Q96 = 2n ** 96n;
    const multiplier = 1000000n;
    const sqrtPriceBig = BigInt(Math.floor(sqrtPrice * 1000000));
    return (sqrtPriceBig * Q96) / multiplier;
}

async function main() {
    console.log("🔧 Simple Pool Initialization Test\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const deployment = require("../deployments/sepolia-deployment.json");
    const AED_STABLE = deployment.contracts.AED_STABLE;
    const INR_STABLE = deployment.contracts.INR_STABLE;

    const [currency0, currency1] = BigInt(AED_STABLE) < BigInt(INR_STABLE)
        ? [AED_STABLE, INR_STABLE]
        : [INR_STABLE, AED_STABLE];

    console.log("Currency0:", currency0);
    console.log("Currency1:", currency1);
    console.log("Fee: 3000 (0.3%)");
    console.log("TickSpacing: 60");

    const lpm = await ethers.getContractAt(
        ["function initializePool((address,address,uint24,int24,address),uint160) external returns (int24)"],
        POSITION_MANAGER
    );

    const sqrtPriceX96 = calculateSqrtPriceX96();
    console.log("\nsqrtPriceX96:", sqrtPriceX96.toString());

    const poolKey = [
        currency0,                                        // currency0
        currency1,                                        // currency1
        3000,                                            // fee
        60,                                              // tickSpacing  
        "0x0000000000000000000000000000000000000000"  // hooks
    ];

    console.log("\nAttempting to initialize pool...");
    try {
        const gasEstimate = await lpm.initializePool.estimateGas(poolKey, sqrtPriceX96);
        console.log("Gas estimate:", gasEstimate.toString());

        const tx = await lpm.initializePool(poolKey, sqrtPriceX96, {
            gasLimit: gasEstimate * 120n / 100n
        });
        console.log("TX submitted:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\n✅ Transaction mined!");
        console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Block:", receipt.blockNumber);
        console.log("\nEtherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Parse logs to see what happened
        console.log("\nLogs:", receipt.logs.length, "events emitted");
        for (let i = 0; i < Math.min(receipt.logs.length, 5); i++) {
            console.log(`  Log ${i}:`, receipt.logs[i].topics[0]);
        }
    } catch (error) {
        console.log("\n❌ Error:");
        console.log("Message:", error.message);
        if (error.data) console.log("Data:", error.data);
        if (error.code) console.log("Code:", error.code);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
