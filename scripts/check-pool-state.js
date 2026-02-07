const { ethers } = require("hardhat");

const POOL_MANAGER = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS = "0x0000000000000000000000000000000000000000";

async function main() {
    const [deployer] = await ethers.getSigners();

    // Calculate Pool ID
    const [currency0, currency1] = AED_TOKEN.toLowerCase() < INR_TOKEN.toLowerCase()
        ? [AED_TOKEN, INR_TOKEN]
        : [INR_TOKEN, AED_TOKEN];

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const poolKey = {
        currency0,
        currency1,
        fee: FEE,
        tickSpacing: TICK_SPACING,
        hooks: HOOKS
    };

    const encoded = abiCoder.encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );

    const poolId = ethers.keccak256(encoded);
    console.log("Pool ID:", poolId);

    // Check Slot0
    // Try different signatures for extsload or pools
    const pm = new ethers.Contract(POOL_MANAGER, [
        "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
        // Fallback or old version
        "function pools(bytes32 id) external view returns (tuple(uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) slot0, uint128 liquidity, uint128 protocolFeesAccrued0, uint128 protocolFeesAccrued1)",
        // Generic generic
        "function extSload(bytes32 slot) external view returns (bytes32)"
    ], deployer);

    try {
        console.log("Calling getSlot0...");
        const slot0 = await pm.getSlot0(poolId);
        console.log("Slot0:", slot0);
        console.log("SqrtPriceX96:", slot0[0].toString());
        console.log("Tick:", slot0[1].toString());
    } catch (e) {
        console.log("getSlot0 failed. Trying pools(id)...");
        try {
            const poolInfo = await pm.pools(poolId);
            console.log("Pool Info:", poolInfo);
            console.log("SqrtPrice:", poolInfo[0][0].toString());
            console.log("Tick:", poolInfo[0][1].toString());
            console.log("Liquidity:", poolInfo[1].toString());

            if (poolInfo[0][0] == 0n) {
                console.log("⚠️ Pool exists but SqrtPrice is 0! Not initialized?");
            } else {
                console.log("✅ Pool seems initialized.");
            }

        } catch (e2) {
            console.log("pools(id) failed:", e2.message);
        }
    }
}

main().catch(console.error);
