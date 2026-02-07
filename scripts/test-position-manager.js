const { ethers } = require("hardhat");

const POSITION_MANAGER = "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80";

async function main() {
  console.log("🔍 Testing PositionManager connection...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);

  // Simple ABI for the functions we need
  const positionManagerABI = [
    "function nextTokenId() external view returns (uint256)",
    "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable"
  ];

  const positionManager = new ethers.Contract(
    POSITION_MANAGER,
    positionManagerABI,
    deployer
  );

  // Test read function
  const nextTokenId = await positionManager.nextTokenId();
  console.log("Next Token ID:", nextTokenId.toString());
  console.log("\n✅ PositionManager connection working!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
