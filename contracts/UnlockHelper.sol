// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal PoolManager interface
interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
    
    function unlock(bytes calldata data) external returns (bytes memory);
}

/// @title UnlockHelper
/// @notice Helper contract to initialize Uniswap V4 pools using the unlock pattern
/// @dev Implements the IUnlockCallback interface to work with PoolManager
contract UnlockHelper {
    address public immutable poolManager;

    struct InitializeData {
        IPoolManager.PoolKey key;
        uint160 sqrtPriceX96;
    }

    error UnauthorizedCallback();

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Initialize a pool using the unlock pattern
    /// @param key The pool key (currency0, currency1, fee, tickSpacing, hooks)
    /// @param sqrtPriceX96 The initial sqrt price
    function initializePool(IPoolManager.PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick) {
        bytes memory data = abi.encode(InitializeData({key: key, sqrtPriceX96: sqrtPriceX96}));
        
        // Call unlock - PoolManager will call back to unlockCallback
        bytes memory result = IPoolManager(poolManager).unlock(data);
        
        // Decode the tick returned from initialize
        tick = abi.decode(result, (int24));
    }

    /// @notice Callback function called by PoolManager during unlock
    /// @param data Encoded InitializeData
    /// @return Empty bytes (required by interface)
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        // Only PoolManager can call this
        if (msg.sender != poolManager) revert UnauthorizedCallback();

        // Decode the initialization data
        InitializeData memory initData = abi.decode(data, (InitializeData));

        // Call initialize on PoolManager (now that we're unlocked)
        int24 tick = IPoolManager(poolManager).initialize(initData.key, initData.sqrtPriceX96);

        // Return the tick
        return abi.encode(tick);
    }
}
