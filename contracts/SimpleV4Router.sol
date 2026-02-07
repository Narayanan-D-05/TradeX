// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CurrencySettler} from "@openzeppelin/uniswap-hooks/src/utils/CurrencySettler.sol";

// Define Legacy Interface matching the deployed PoolManager
interface ILegacyPoolManager {
    struct ModifyLiquidityParams {
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
    }

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData) external returns (BalanceDelta);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) external returns (BalanceDelta);
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

contract SimpleV4Router is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencySettler for Currency;

    ILegacyPoolManager public immutable manager;

    constructor(address _manager) {
        manager = ILegacyPoolManager(_manager);
    }

    struct CallbackData {
        address sender;
        PoolKey key;
        SwapParams swapParams;
        ILegacyPoolManager.ModifyLiquidityParams liqParams;
        bytes hookData;
        bool isSwap;
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Only manager");
        
        CallbackData memory cbData = abi.decode(data, (CallbackData));
        
        BalanceDelta delta;
        if (cbData.isSwap) {
            delta = manager.swap(cbData.key, cbData.swapParams, cbData.hookData);
        } else {
            delta = manager.modifyLiquidity(cbData.key, cbData.liqParams, cbData.hookData);
        }

        // Handle Currency 0
        int128 delta0 = delta.amount0();
        if (delta0 < 0) {
            // Cast to IPoolManager to satisfy library
            cbData.key.currency0.settle(IPoolManager(address(manager)), cbData.sender, uint256(uint128(-delta0)), false);
        } else if (delta0 > 0) {
            cbData.key.currency0.take(IPoolManager(address(manager)), cbData.sender, uint256(uint128(delta0)), false);
        }

        // Handle Currency 1
        int128 delta1 = delta.amount1();
        if (delta1 < 0) {
            cbData.key.currency1.settle(IPoolManager(address(manager)), cbData.sender, uint256(uint128(-delta1)), false);
        } else if (delta1 > 0) {
            cbData.key.currency1.take(IPoolManager(address(manager)), cbData.sender, uint256(uint128(delta1)), false);
        }

        return abi.encode(delta);
    }

    function addLiquidity(PoolKey memory key, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes calldata hookData) external payable {
        ILegacyPoolManager.ModifyLiquidityParams memory params = ILegacyPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta
        });

        manager.unlock(abi.encode(CallbackData(msg.sender, key, SwapParams(false, 0, 0), params, hookData, false)));
    }
    
    // Helper to initialize via router if needed (wrapping the 2-arg init)
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick) {
        return manager.initialize(key, sqrtPriceX96);
    }
}
