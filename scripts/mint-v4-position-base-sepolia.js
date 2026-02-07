const hre = require("hardhat");
const { ethers } = require("hardhat");

// Base Sepolia deployment addresses
const POSITION_MANAGER = "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80";
const AED_TOKEN = "0xd16B4e66c77048D68e6438068AfBBf4c96506d7F";
const INR_TOKEN = "0xed7D8f68d65F07275E162b1B7d8D9c95dF4af48a";

// Pool parameters
const FEE = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = "0x0000000000000000000000000000000000000000";

// Actions enum from v4-periphery
const Actions = {
  MINT_POSITION: 0,
  INCREASE_LIQUIDITY: 1,
  DECREASE_LIQUIDITY: 2,
  BURN_POSITION: 3,
  SETTLE_PAIR: 7,
  SETTLE: 8,
  TAKE_PAIR: 9,
  CLOSE_CURRENCY: 12,
  SWEEP: 14,
};

async function main() {
  console.log("\n🦄 Minting Uniswap V4 Position on Base Sepolia\n");

  const [deployer] = await ethers.getSigners();
  console.log("Signer address:", deployer.address);

  // Check balances
  const aedToken = await ethers.getContractAt("MockERC20", AED_TOKEN);
  const inrToken = await ethers.getContractAt("MockERC20", INR_TOKEN);

  const aedBalance = await aedToken.balanceOf(deployer.address);
  const inrBalance = await inrToken.balanceOf(deployer.address);

  console.log(`\nToken Balances:`);
  console.log(`AED: ${ethers.formatUnits(aedBalance, 6)} AED`);
  console.log(`INR: ${ethers.formatUnits(inrBalance, 6)} INR`);

  if (aedBalance == 0n || inrBalance == 0n) {
    console.log("\n❌ ERROR: You need both AED and INR tokens to add liquidity");
    console.log("Run the mint script first or get tokens from the faucet");
    return;
  }

  // Define liquidity amounts - START SMALL for testing
  const aedAmount = ethers.parseUnits("10", 6); // 10 AED
  const inrAmount = ethers.parseUnits("227", 6); // 227 INR (10 * 22.7)

  console.log(`\nAdding Liquidity:`);
  console.log(`AED: ${ethers.formatUnits(aedAmount, 6)}`);
  console.log(`INR: ${ethers.formatUnits(inrAmount, 6)}`);

  // Define tick range - use MINIMAL range for testing
  // Tick spacing = 60, so ticks must be divisible by 60
  const tickLower = -600; // Very narrow range for testing
  const tickUpper = 600;

  // Use MINIMAL liquidity for initial test
  const liquidity = 1000000n; // Start with 1 million (very small in V4 terms)

  console.log(`\nTick Range: ${tickLower} to ${tickUpper} (Minimal Test Range)`);
  console.log(`Test Liquidity: ${liquidity.toString()}`);

  console.log(`\nTick Range: ${tickLower} to ${tickUpper} (Full Range)`);
  console.log(`Liquidity: ${ethers.formatUnits(liquidity, 18)}`);

  // Step 1: Approve tokens to Permit2 and approve PositionManager on Permit2
  console.log("\n1️⃣ Approving tokens via Permit2...");

  const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
  // const permit2 = await ethers.getContractAt("IPermit2", PERMIT2_ADDRESS); // Skipped to use raw interface

  // 1. Approve Permit2 on the tokens (Standard ERC20 approve)
  const aedAllowance = await aedToken.allowance(deployer.address, PERMIT2_ADDRESS);
  if (aedAllowance < aedAmount) {
    console.log("Approving Permit2 for AED...");
    const tx = await aedToken.approve(PERMIT2_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    console.log("✅ Permit2 approved on AED");
  } else {
    console.log("✅ Permit2 already approved on AED");
  }

  const inrAllowance = await inrToken.allowance(deployer.address, PERMIT2_ADDRESS);
  if (inrAllowance < inrAmount) {
    console.log("Approving Permit2 for INR...");
    const tx = await inrToken.approve(PERMIT2_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    console.log("✅ Permit2 approved on INR");
  } else {
    console.log("✅ Permit2 already approved on INR");
  }

  // 2. Approve PositionManager on Permit2 (Permit2.approve)
  // We need IPermit2 interface for this. Since we might not have the artifact, 
  // let's use a raw contract with the specific function we need.
  const permit2Contract = new ethers.Contract(
    PERMIT2_ADDRESS,
    [
      "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
      "function allowance(address user, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)"
    ],
    deployer
  );

  console.log("Checking Permit2 allowances for PositionManager...");

  // Check/Approve AED on Permit2
  const [amountAed, expirationAed] = await permit2Contract.allowance(deployer.address, AED_TOKEN, POSITION_MANAGER);
  if (amountAed < aedAmount) {
    console.log("Approving PositionManager on Permit2 for AED...");
    // Expiration: 30 days
    const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const MaxUint160 = (1n << 160n) - 1n;
    const tx = await permit2Contract.approve(AED_TOKEN, POSITION_MANAGER, MaxUint160, expiration);
    await tx.wait();
    console.log("✅ PositionManager approved on Permit2 for AED");
  } else {
    console.log("✅ PositionManager already approved on Permit2 for AED");
  }

  // Check/Approve INR on Permit2
  const [amountInr, expirationInr] = await permit2Contract.allowance(deployer.address, INR_TOKEN, POSITION_MANAGER);
  if (amountInr < inrAmount) {
    console.log("Approving PositionManager on Permit2 for INR...");
    const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const MaxUint160 = (1n << 160n) - 1n;
    const tx = await permit2Contract.approve(INR_TOKEN, POSITION_MANAGER, MaxUint160, expiration);
    await tx.wait();
    console.log("✅ PositionManager approved on Permit2 for INR");
  } else {
    console.log("✅ PositionManager already approved on Permit2 for INR");
  }

  // Step 2: Encode actions
  console.log("\n2️⃣ Encoding actions...");

  // Actions: MINT_POSITION + SETTLE_PAIR
  const actions = ethers.solidityPacked(
    ["uint8", "uint8"],
    [Actions.MINT_POSITION, Actions.SETTLE_PAIR]
  );
  console.log("Actions encoded:", actions);

  // Step 3: Encode parameters
  console.log("\n3️⃣ Encoding parameters...");

  // PoolKey struct
  const poolKey = {
    currency0: AED_TOKEN,
    currency1: INR_TOKEN,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS,
  };

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // MINT_POSITION parameters
  const mintParams = abiCoder.encode(
    [
      "tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
      "int24",
      "int24",
      "uint256",
      "uint256",
      "uint256",
      "address",
      "bytes",
    ],
    [
      poolKey,
      tickLower,
      tickUpper,
      liquidity,
      aedAmount,
      inrAmount,
      deployer.address, // recipient of the NFT
      "0x", // hookData
    ]
  );

  // SETTLE_PAIR parameters
  const settlePairParams = abiCoder.encode(
    ["address", "address"],
    [AED_TOKEN, INR_TOKEN]
  );

  const params = [mintParams, settlePairParams];
  console.log("Parameters encoded");

  // Step 4: Encode calldata and send transaction
  console.log("\n4️⃣ Encoding calldata...");

  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

  // Encode unlockData = abi.encode(actions, params)
  const unlockData = abiCoder.encode(
    ["bytes", "bytes[]"],
    [actions, params]
  );

  console.log("Unlock data encoded");
  console.log("Unlock data length:", unlockData.length);

  // Create interface and encode function call
  const iface = new ethers.Interface([
    "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable"
  ]);

  const calldata = iface.encodeFunctionData("modifyLiquidities", [unlockData, deadline]);

  console.log("\n5️⃣ Sending transaction...");
  console.log("Calldata length:", calldata.length);
  console.log("First 10 bytes:", calldata.substring(0, 20));
  console.log("Calldata type:", typeof calldata);
  console.log("Is valid hex?:", ethers.isHexString(calldata));

  try {
    // WORKAROUND: Don't use sendTransaction, use contract method directly
    console.log("\n🚀 Calling modifyLiquidities directly via contract interface...");

    // Create contract instance with the interface
    const positionManagerContract = new ethers.Contract(
      POSITION_MANAGER,
      [
        "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable returns (bytes memory)"
      ],
      deployer
    );

    console.log("- Contract:", positionManagerContract.target);
    console.log("- UnlockData length:", unlockData.length);
    console.log("- Deadline:", deadline);

    // Call the contract method directly (ethers will encode it)
    try {
      console.log("\n🕵️ Simulating transaction with callStatic...");
      await positionManagerContract.modifyLiquidities.staticCall(
        unlockData,
        deadline,
        {
          gasLimit: 3000000,
        }
      );
      console.log("✅ Simulation successful! Proceeding to real tx...");
    } catch (e) {
      console.error("\n❌ Simulation Failed!");
      console.error("Reason:", e.message);
      if (e.data) {
        console.error("Data:", e.data);
        // Try to decode common errors
        // Error(string)
        // Panic(uint256)
        try {
          const decoded = abiCoder.decode(['string'], e.data);
          console.error("Decoded Error:", decoded[0]);
        } catch (_) { }
      }
      return; // Stop here if simulation fails
    }

    const tx = await positionManagerContract.modifyLiquidities(
      unlockData,
      deadline,
      {
        gasLimit: 3000000,
      }
    );

    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    // DEBUG: Check what's actually in the receipt
    console.log("\n📊 RECEIPT DEBUG:");
    console.log("Status:", receipt.status);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Transaction data in receipt:", receipt.data || "not in receipt object");

    // Fetch the actual transaction to see its data
    const txData = await deployer.provider.getTransaction(receipt.hash);
    console.log("\n📝 ACTUAL TRANSACTION DATA:");
    console.log("To:", txData.to);
    console.log("Data length:", txData.data?.length || 0);
    console.log("Data first 66 chars:", txData.data?.substring(0, 66) || "EMPTY");
    console.log("Full data (first 200 chars):", txData.data?.substring(0, 200) || "EMPTY");

    if (receipt.status === 0) {
      console.log("\n❌ Transaction REVERTED");
      throw new Error("Transaction reverted");
    }

    console.log("\n✅ Transaction confirmed!");

    // Look for Transfer event (ERC-721 position NFT minted)
    const erc721Iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ]);

    const transferLog = receipt.logs?.find((log) => {
      if (log.address.toLowerCase() !== POSITION_MANAGER.toLowerCase()) return false;
      try {
        const parsed = erc721Iface.parseLog({ topics: log.topics, data: log.data });
        return parsed && parsed.name === "Transfer";
      } catch {
        return false;
      }
    });

    if (transferLog) {
      const parsed = erc721Iface.parseLog({ topics: transferLog.topics, data: transferLog.data });
      console.log("\n🎉 Position NFT Token ID:", parsed.args.tokenId.toString());
    }

    console.log("\n📊 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/tx/${receipt.hash}`);

    console.log("\n✅ Success! You can now:");
    console.log("1. View your position on the PositionManager contract");
    console.log("2. Perform swaps on your TradeX frontend");
    console.log("3. Increase/decrease liquidity as needed");

  } catch (error) {
    console.error("\n❌ Transaction failed:", error.message);

    if (error.error) {
      console.error("Error details:", error.error);
    }

    if (error.message.includes("insufficient funds")) {
      console.log("\nYou need more Base Sepolia ETH for gas.");
      console.log("Get some from: https://www.alchemy.com/faucets/base-sepolia");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
