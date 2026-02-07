const hre = require("hardhat");
const ethers = hre.ethers;

const INIT_TX = "0xee31eaea3bce74e592264e2aa355b9aed490752a4ca77725e8d202541a018465";

async function main() {
    console.log("🔍 Analyzing Pool Initialization Transaction\n");

    const receipt = await ethers.provider.getTransactionReceipt(INIT_TX);

    console.log("Transaction:", INIT_TX);
    console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Logs:", receipt.logs.length);

    // Look for Initialize event
    // event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)
    const initEventSig = ethers.id("Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)");
    
    console.log("\n📋 All Events:");
    receipt.logs.forEach((log, i) => {
        console.log(`\nEvent ${i}:`);
        console.log("  Address:", log.address);
        console.log("  Topics:", log.topics.length);
        console.log("  Topic[0]:", log.topics[0]);
        
        if (log.topics[0] === initEventSig) {
            console.log("  ✅ THIS IS THE INITIALIZE EVENT!");
            console.log("  Pool ID (topic[1]):", log.topics[1]);
            
            // Decode the data
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();
            try {
                const decoded = abiCoder.decode(
                    ["uint24", "int24", "address", "uint160", "int24"],
                    log.data
                );
                console.log("  Fee:", decoded[0].toString());
                console.log("  TickSpacing:", decoded[1].toString());
                console.log("  Hooks:", decoded[2]);
                console.log("  sqrtPriceX96:", decoded[3].toString());
                console.log("  Tick:", decoded[4].toString());
            } catch (e) {
                console.log("  Could not decode data");
            }
        }
    });

    console.log("\n🎯 Summary:");
    const initEvents = receipt.logs.filter(log => log.topics[0] === initEventSig);
    if (initEvents.length > 0) {
        console.log("✅ Initialize event WAS emitted!");
        console.log("   Pool was successfully created");
        console.log("   Pool ID from event:", initEvents[0].topics[1]);
    } else {
        console.log("❌ No Initialize event found");
        console.log("   Pool initialization may have failed silently");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
