// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {CurrencySettler} from "@openzeppelin/uniswap-hooks/src/utils/CurrencySettler.sol";

/// @title TradeXV4Router - Custom Uniswap V4 Swap & Liquidity Router for TradeX
/// @notice Handles swaps and liquidity operations on Uniswap V4 PoolManager via unlock callback pattern
/// @dev Uses the CurrencySettler library for proper ERC-20 settlement with the PoolManager
contract TradeXV4Router is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;

    /// @notice Emitted on every successful swap
    event SwapExecuted(
        address indexed sender,
        Currency indexed currencyIn,
        Currency indexed currencyOut,
        int128 amountIn,
        int128 amountOut
    );

    /// @notice Emitted on every successful liquidity modification
    event LiquidityModified(
        address indexed sender,
        int128 delta0,
        int128 delta1
    );

    /// @notice Internal struct passed through unlock callback
    struct CallbackData {
        address sender;
        PoolKey key;
        SwapParams swapParams;
        ModifyLiquidityParams liqParams;
        bytes hookData;
        bool isSwap;
    }

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    // ============================================================
    //                    UNLOCK CALLBACK
    // ============================================================

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "TradeXV4Router: Only manager");

        CallbackData memory cbData = abi.decode(data, (CallbackData));

        BalanceDelta delta;
        if (cbData.isSwap) {
            delta = manager.swap(cbData.key, cbData.swapParams, cbData.hookData);
        } else {
            (delta, ) = manager.modifyLiquidity(cbData.key, cbData.liqParams, cbData.hookData);
        }

        // Settle currency0
        int128 delta0 = delta.amount0();
        if (delta0 < 0) {
            // User owes tokens → transfer from user to PoolManager
            cbData.key.currency0.settle(manager, cbData.sender, uint256(uint128(-delta0)), false);
        } else if (delta0 > 0) {
            // User receives tokens → deliver ERC-20 from PoolManager to user
            cbData.key.currency0.take(manager, cbData.sender, uint256(uint128(delta0)), false);
        }

        // Settle currency1
        int128 delta1 = delta.amount1();
        if (delta1 < 0) {
            cbData.key.currency1.settle(manager, cbData.sender, uint256(uint128(-delta1)), false);
        } else if (delta1 > 0) {
            cbData.key.currency1.take(manager, cbData.sender, uint256(uint128(delta1)), false);
        }

        // Emit appropriate event
        if (cbData.isSwap) {
            emit SwapExecuted(cbData.sender, cbData.key.currency0, cbData.key.currency1, delta0, delta1);
        } else {
            emit LiquidityModified(cbData.sender, delta0, delta1);
        }

        return abi.encode(delta);
    }

    // ============================================================
    //                    PUBLIC SWAP
    // ============================================================

    /// @notice Execute a swap on a Uniswap V4 pool
    /// @param key The pool key identifying the pool
    /// @param params Swap parameters (zeroForOne, amountSpecified, sqrtPriceLimitX96)
    /// @param hookData Arbitrary data forwarded to hooks
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata hookData
    ) external payable {
        manager.unlock(
            abi.encode(
                CallbackData(
                    msg.sender,
                    key,
                    params,
                    ModifyLiquidityParams(0, 0, 0, bytes32(0)),
                    hookData,
                    true
                )
            )
        );
    }

    // ============================================================
    //                    PUBLIC LIQUIDITY
    // ============================================================

    /// @notice Add or remove liquidity from a Uniswap V4 pool
    /// @param key The pool key identifying the pool
    /// @param params Liquidity parameters (tickLower, tickUpper, liquidityDelta, salt)
    /// @param hookData Arbitrary data forwarded to hooks
    function addLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable {
        manager.unlock(
            abi.encode(
                CallbackData(
                    msg.sender,
                    key,
                    SwapParams(false, 0, 0),
                    params,
                    hookData,
                    false
                )
            )
        );
    }

    /// @notice Allow contract to receive ETH (for native currency pools)
    receive() external payable {}
}
