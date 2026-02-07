// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
}

/// @title SimpleLiquidityTest
/// @notice Test liquidity operations
contract SimpleLiquidityTest {
    address public immutable poolManager;
    
    event UnlockCallbackCalled(bytes data);

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    function testAddLiquidity(bytes calldata data) external returns (bytes memory) {
        return IPoolManager(poolManager).unlock(data);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        emit UnlockCallbackCalled(data);
        return data;
    }
}
