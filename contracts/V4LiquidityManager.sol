// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IPoolManager {
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
        bytes32 salt;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData) external returns (int256, int256);
    function sync(address currency) external;
}

/// @title V4LiquidityManager
/// @notice Simplified helper for adding liquidity to Uniswap V4 pools
contract V4LiquidityManager {
    address public immutable poolManager;

    struct AddLiquidityParams {
        IPoolManager.PoolKey key;
        IPoolManager.ModifyLiquidityParams params;
        uint256 amount0Max;
        uint256 amount1Max;
        address sender;
    }

    event LiquidityAdded(address indexed sender, int256 amount0, int256 amount1);

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Add liquidity to a pool (transfers tokens from sender)
    function addLiquidity(
        IPoolManager.PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        uint256 amount0Max,
        uint256 amount1Max
    ) external returns (int256 delta0, int256 delta1) {
        // Transfer tokens to this contract first
        if (amount0Max > 0) {
            IERC20(key.currency0).transferFrom(msg.sender, address(this), amount0Max);
        }
        if (amount1Max > 0) {
            IERC20(key.currency1).transferFrom(msg.sender, address(this), amount1Max);
        }

        AddLiquidityParams memory params = AddLiquidityParams({
            key: key,
            params: IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: liquidityDelta,
                salt: bytes32(0)
            }),
            amount0Max: amount0Max,
            amount1Max: amount1Max,
            sender: msg.sender
        });

        bytes memory result = IPoolManager(poolManager).unlock(abi.encode(params));
        (delta0, delta1) = abi.decode(result, (int256, int256));

        // Return unused tokens
        uint256 spent0 = delta0 < 0 ? uint256(-delta0) : 0;
        uint256 spent1 = delta1 < 0 ? uint256(-delta1) : 0;

        if (amount0Max > spent0) {
            IERC20(key.currency0).transfer(msg.sender, amount0Max - spent0);
        }
        if (amount1Max > spent1) {
            IERC20(key.currency1).transfer(msg.sender, amount1Max - spent1);
        }

        emit LiquidityAdded(msg.sender, delta0, delta1);
    }

    /// @notice Unlock callback from PoolManager
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == poolManager, "Only PoolManager");

        AddLiquidityParams memory params = abi.decode(rawData, (AddLiquidityParams));

        // Transfer tokens to PoolManager
        if (params.amount0Max > 0) {
            IERC20(params.key.currency0).transfer(poolManager, params.amount0Max);
            IPoolManager(poolManager).sync(params.key.currency0);
        }
        if (params.amount1Max > 0) {
            IERC20(params.key.currency1).transfer(poolManager, params.amount1Max);
            IPoolManager(poolManager).sync(params.key.currency1);
        }

        // Modify liquidity
        (int256 delta0, int256 delta1) = IPoolManager(poolManager).modifyLiquidity(
            params.key,
            params.params,
            ""
        );

        return abi.encode(delta0, delta1);
    }
}
