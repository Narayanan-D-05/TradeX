const { ethers } = require("ethers");

const RPC_URL = "https://sepolia.base.org";
const POOL_MANAGERS = [
    { name: "Original", address: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" },
    { name: "Alternative", address: "0x1b832D5395A41446b508632466cf32c6C07D63c7" }
];

async function main() {
    console.log("\n🔍 BASE SEPOLIA POOLMANAGER DIAGNOSTIC\n");

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    for (const pm of POOL_MANAGERS) {
        console.log(`\n📍 ${pm.name}: ${pm.address}`);
        
        // Check if contract exists
        const code = await provider.getCode(pm.address);
        if (code === "0x") {
            console.log(`   ❌ NO CODE DEPLOYED`);
            continue;
        }
        console.log(`   ✅ Contract exists (${code.length} bytes)`);

        // Try to call it without ABI - just check if it's responsive
        try {
            const balance = await provider.getBalance(pm.address);
            console.log(`   💰 ETH Balance: ${ethers.formatEther(balance)}`);
        } catch (e) {
            console.log(`   ⚠️  Cannot query balance`);
        }

        // Try different possible function signatures
        const signatures = [
            { name: "getSlot0(bytes32)", selector: "0x7c4f0c6c" },
            { name: "getPoolData(bytes32)", selector: "0x" },
            { name: "pools(bytes32)", selector: "0x" },
        ];

        console.log(`   🔬 Testing function signatures...`);
        
        // Most basic test: does it revert or respond?
        const poolId = "0x33ee81b5aedba6f3a2aa1f426c5ee98f8cf9c821524f381d1c1d61d8912af281";
        
        try {
            // Try basic staticCall
            const data = ethers.concat([
                "0x7c4f0c6c", // getSlot0(bytes32) selector
                ethers.zeroPadValue(poolId, 32)
            ]);
            
            const result = await provider.call({
                to: pm.address,
                data: data
            });
            
            console.log(`   ✅ getSlot0 call succeeded!`);
            console.log(`   📦 Result: ${result}`);
            
            // Try to decode
            if (result !== "0x") {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                    ["uint160", "int24", "uint24", "uint24"],
                    result
                );
                console.log(`   📊 sqrtPriceX96: ${decoded[0].toString()}`);
                console.log(`   📊 tick: ${decoded[1].toString()}`);
            }
        } catch (e) {
            console.log(`   ❌ getSlot0 reverted: ${e.message.split('\n')[0]}`);
        }
    }

    console.log("\n🎯 Checking Uniswap V4 official deployments...");
    console.log("   Base Sepolia may use different addresses than expected.");
    console.log("   Check: https://docs.uniswap.org/contracts/v4/deployments");
}

main().catch(console.error);
