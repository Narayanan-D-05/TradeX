const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
    const AED_STABLE = "0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c";
    const INR_STABLE = "0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41";

    const poolKey = {
        currency0: AED_STABLE,
        currency1: INR_STABLE,
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000"
    };

    // Calculate pool ID
    const poolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )
    );

    console.log("🔍 Checking Pool State in PoolManager Storage\n");
    console.log("Pool ID:", poolId);

    // Read pool storage slots directly
    // In V4, pools are stored in a mapping(bytes32 => Pool.State)
    // The storage layout starts at slot 0
    
    const poolManager = new ethers.Contract(
        POOL_MANAGER,
        ["function extsload(bytes32[] calldata slots) external view returns (bytes32[] memory)"],
        ethers.provider
    );

    // Try to read multiple storage slots for this pool
    const baseSlot = poolId;
    const slots = [
        baseSlot,  // sqrtPriceX96
        ethers.keccak256(ethers.concat([baseSlot, ethers.toBeHex(1, 32)])),  // tick
        ethers.keccak256(ethers.concat([baseSlot, ethers.toBeHex(2, 32)])),  // protocolFee
    ];

    try {
        const values = await poolManager.extsload(slots);
        
        console.log("\nPool Storage:");
        console.log("  Slot 0 (sqrtPriceX96):", values[0]);
        console.log("  Slot 1 (tick):", values[1]);
        console.log("  Slot 2 (other):", values[2]);

        const sqrtPrice = BigInt(values[0]);
        if (sqrtPrice > 0n) {
            console.log("\n✅ Pool HAS state! sqrtPriceX96 =", sqrtPrice.toString());
            console.log("   Pool is already initialized!");
            console.log("\n💡 This explains the 30k gas with zero events:");
            console.log("   PositionManager.initializePool() detected pool exists and returned early");
        } else {
            console.log("\n❌ Pool has NO state (sqrtPriceX96 = 0)");
            console.log("   Pool is NOT initialized");
        }
    } catch (error) {
        console.log("❌ Error reading pool state:", error.message);
    }

    // Also try the getSlot0 approach
    console.log("\n📞 Trying getSlot0()...");
    const getSlot0Abi = ["function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"];
    const poolManagerWithSlot0 = new ethers.Contract(POOL_MANAGER, getSlot0Abi, ethers.provider);
    
    try {
        const slot0 = await poolManagerWithSlot0.getSlot0(poolId);
        console.log("✅ getSlot0 works!");
        console.log("  sqrtPriceX96:", slot0[0].toString());
        console.log("  tick:", slot0[1].toString());
        console.log("  protocolFee:", slot0[2].toString());
        console.log("  lpFee:", slot0[3].toString());
        
        if (BigInt(slot0[0]) > 0n) {
            console.log("\n🎉 POOL IS INITIALIZED with sqrtPrice =", slot0[0].toString());
        }
    } catch (error) {
        console.log("❌ getSlot0 failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
