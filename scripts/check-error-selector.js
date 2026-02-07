const { ethers } = require("ethers");

const errors = [
    "PoolNotInitialized()",
    "PoolAlreadyInitialized()",
    "LiquidityOverflow()",
    "TickSpacingNotDefault()",
    "TicksNotMisordered()",
    "TickLowerGreaterThanUpper()",
    "TickLowerImproperlySpaced()",
    "TickUpperImproperlySpaced()",
    "OnlyPoolManager()",
    "UnlockCallbackFailed()",
    "DeadlinePassed(uint256)",
    "TransactionDeadlinePassed(uint256)",
    "PriceSlippage(uint160)",
    "AmountSlippage(uint256,uint256)",
    "NoLiquidityToBurn()",
    "NoLikelySuccess()",
    "InvalidTickSpacing()",
    "InvalidFee()",
    "InvalidCurrencyOrder()",
    "InvalidHooks()",
    "UnsupportedAction()",
    "InputLengthMismatch()",
    "InvalidSigner()",
    "InvalidNonce()",
    "SignatureExpired(uint256,uint256)",
    "InsufficientAllowance()",
    "InsufficientAllowance(uint256,uint256)",
    "FromAddressIsNotOwner()",
    "SpenderExpired(uint256,uint256)",
    "InvalidPermit()",
    "TransferFromFailed()",
    "DelegateCallFailed()",
    "InvalidCaller()",
    "ExecutionFailed()",
    "SlippageCheckFailed()",
    "NotPoolManager()",
    "InvalidPool()",
    "PoolNotInitialized()",
    "TransferFailed()",
    "STF()",
];

console.log("Searching for selector: 0x5212cba1");

for (const err of errors) {
    const selector = ethers.id(err).slice(0, 10);
    console.log(`${selector} : ${err}`);
    if (selector === "0x5212cba1" || selector === "0x3b99b53d") {
        console.log("\n🎯 MATCH FOUND: " + err);
    }
}
