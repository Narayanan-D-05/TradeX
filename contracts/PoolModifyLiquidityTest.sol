// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title PoolModifyLiquidityTest
 * @notice Test contract for modifying liquidity in V4 pools
 * @dev Based on Uniswap v4-core test contract
 */
contract PoolModifyLiquidityTest {
    address public immutable manager;

    struct CallbackData {
        address sender;
        PoolKey key;
        ModifyLiquidityParams params;
        bytes hookData;
    }

    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct ModifyLiquidityParams {
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
    }

    constructor(address _manager) {
        manager = _manager;
    }

    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external payable returns (int256 delta0, int256 delta1) {
        // Encode callback data
        bytes memory data = abi.encode(CallbackData({
            sender: msg.sender,
            key: key,
            params: params,
            hookData: hookData
        }));

        // Call unlock on PoolManager
        bytes memory result = IPoolManager(manager).unlock(data);
        (delta0, delta1) = abi.decode(result, (int256, int256));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == manager, "Only manager");

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        // Call modifyLiquidity on PoolManager
        (int256 delta0, int256 delta1) = IPoolManager(manager).modifyLiquidity(
            data.key,
            data.params,
            data.hookData
        );

        // Settle deltas
        if (delta0 > 0) {
            _settle(data.key.currency0, data.sender, uint256(delta0));
        } else if (delta0 < 0) {
            _take(data.key.currency0, data.sender, uint256(-delta0));
        }

        if (delta1 > 0) {
            _settle(data.key.currency1, data.sender, uint256(delta1));
        } else if (delta1 < 0) {
            _take(data.key.currency1, data.sender, uint256(-delta1));
        }

        return abi.encode(delta0, delta1);
    }

    function _settle(address token, address payer, uint256 amount) internal {
        // Transfer from payer to this contract, then to manager
        IERC20(token).transferFrom(payer, address(this), amount);
        IERC20(token).transfer(manager, amount);
    }

    function _take(address token, address recipient, uint256 amount) internal {
        // In V4, "take" means the pool manager sends tokens
        // This is handled by the manager's internal accounting
        IPoolManager(manager).take(token, recipient, amount);
    }
}

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    
    function modifyLiquidity(
        PoolModifyLiquidityTest.PoolKey memory key,
        PoolModifyLiquidityTest.ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external returns (int256, int256);
    
    function take(address token, address to, uint256 amount) external;
}
