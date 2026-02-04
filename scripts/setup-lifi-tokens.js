const hre = require("hardhat");

async function main() {
    const routerAddress = "0x07d28E89C6320D2cdb6f67585cC35EE9fA944667";
    const inrAddress = "0x0F09aD4F62f6C592aDF35eF059a0B16f6Fe13010";
    const aedAddress = "0x5865b9E57643E92DE466a49fA2ab6095A8320d9B";

    console.log("Setting up supported tokens on LIFIRouter:", routerAddress);

    const [signer] = await hre.ethers.getSigners();
    const router = await hre.ethers.getContractAt("LIFIRouter", routerAddress, signer);

    console.log("Adding INR...");
    const tx1 = await router.addSupportedToken(inrAddress);
    await tx1.wait();
    console.log("INR Added:", tx1.hash);

    console.log("Adding AED...");
    const tx2 = await router.addSupportedToken(aedAddress);
    await tx2.wait();
    console.log("AED Added:", tx2.hash);

    console.log("Done!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
