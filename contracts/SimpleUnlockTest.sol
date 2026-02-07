// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    
    function unlock(bytes calldata data) external returns (bytes memory);
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
}

/// @title Simple Unlock Test
/// @notice Test pool initialization with real parameters
contract SimpleUnlockTest {
    address public immutable poolManager;
    bool public callbackWasCalled;
    string public lastError;
    
    event CallbackInvoked(address caller);
    event InitializeSuccess(int24 tick);
    event InitializeError(string reason);

    struct TestData {
        IPoolManager.PoolKey key;
        uint160 sqrtPriceX96;
    }

    constructor(address _poolManager) {
        poolManager = _poolManager;
    }

    function testInitialize(
        address currency0,
        address currency1,
        uint24 fee,
        int24 tickSpacing,
        address hooks,
        uint160 sqrtPriceX96
    ) external returns (bool) {
        callbackWasCalled = false;
        lastError = "";
        
        IPoolManager.PoolKey memory key = IPoolManager.PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: hooks
        });
        
        TestData memory testData = TestData({
            key: key,
            sqrtPriceX96: sqrtPriceX96
        });
        
        IPoolManager(poolManager).unlock(abi.encode(testData));
        
        return callbackWasCalled && bytes(lastError).length == 0;
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        emit CallbackInvoked(msg.sender);
        callbackWasCalled = true;
        
        TestData memory testData = abi.decode(data, (TestData));
        
        try IPoolManager(poolManager).initialize(testData.key, testData.sqrtPriceX96) returns (int24 tick) {
            emit InitializeSuccess(tick);
            return abi.encode(tick);
        } catch Error(string memory reason) {
            lastError = reason;
            emit InitializeError(reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            if (lowLevelData.length >= 4) {
                bytes4 errorSelector = bytes4(lowLevelData);
                
                if (errorSelector == 0x0c3ca2a8) {
                    lastError = "PoolAlreadyInitialized";
                } else if (errorSelector == 0x48fee69c) {
                    lastError = "Unauthorized";
                } else if (errorSelector == 0x7983c051) {
                    lastError = "ContractLocked";
                } else {
                    lastError = "Unknown error";
                }
            } else {
                lastError = "Unknown error (no data)";
            }
            
            emit InitializeError(lastError);
            revert(lastError);
        }
    }
}
