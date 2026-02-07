// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    
    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external returns (int256, int256);
    
    struct ModifyLiquidityParams {
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
        bytes32 salt;
    }
    
    function take(address currency, address to, uint256 amount) external;
    function settle() external payable returns (uint256);
}

/// @title LiquidityHelper
/// @notice Helper to add liquidity to Uniswap V4 pools using unlock pattern
contract LiquidityHelper {
    address public immutable poolManager;

    struct AddLiquidityData {
        IPoolManager.PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        address recipient;
    }

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Add liquidity to a pool
    function addLiquidity(
        IPoolManager.PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) external returns (int256 amount0, int256 amount1) {
        // Transfer tokens from user to this contract
        IERC20(key.currency0).transferFrom(msg.sender, address(this), amount0Desired);
        IERC20(key.currency1).transferFrom(msg.sender, address(this), amount1Desired);
        
        AddLiquidityData memory data = AddLiquidityData({
            key: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            recipient: msg.sender
        });
        
        bytes memory result = IPoolManager(poolManager).unlock(abi.encode(data));
        (amount0, amount1) = abi.decode(result, (int256, int256));
        
        // Return unused tokens
        if (amount0 > 0) {
            uint256 refund0 = amount0Desired - uint256(amount0);
            if (refund0 > 0) {
                IERC20(key.currency0).transferFrom(address(this), msg.sender, refund0);
            }
        }
        if (amount1 > 0) {
            uint256 refund1 = amount1Desired - uint256(amount1);
            if (refund1 > 0) {
                IERC20(key.currency1).transferFrom(address(this), msg.sender, refund1);
            }
        }
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == poolManager, "Only pool manager");
        
        AddLiquidityData memory data = abi.decode(rawData, (AddLiquidityData));
        
        // Calculate liquidity delta (simplified - actual calculation more complex)
        int256 liquidityDelta = int256(data.amount0Desired + data.amount1Desired);
        
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: data.tickLower,
            tickUpper: data.tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        (int256 amount0, int256 amount1) = IPoolManager(poolManager).modifyLiquidity(
            data.key,
            params,
            ""
        );
        
        // Settle tokens with PoolManager
        if (amount0 > 0) {
            IERC20(data.key.currency0).transferFrom(address(this), poolManager, uint256(amount0));
            IPoolManager(poolManager).settle();
        }
        if (amount1 > 0) {
            IERC20(data.key.currency1).transferFrom(address(this), poolManager, uint256(amount1));
            IPoolManager(poolManager).settle();
        }
        
        return abi.encode(amount0, amount1);
    }
}
