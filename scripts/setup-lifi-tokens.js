const hre = require("hardhat");

async function main() {
    const routerAddress = "0x518042288Ab2633AE7EA3d4F272cEFd21D33126d";
    const inrAddress = "0xC6DADFdf4c046D0A91946351A0aceee261DcA517";
    const aedAddress = "0x05016024652D0c947E5B49532e4287374720d3b2";

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
