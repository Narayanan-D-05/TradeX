// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title PositionManagerHelper
 * @notice Helper contract for managing Uniswap V4 positions (add/remove liquidity)
 * @dev Implements the unlock callback pattern required by V4 PoolManager
 */
contract PositionManagerHelper {
    address public immutable poolManager;
    
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
        uint256 amount0Max;
        uint256 amount1Max;
    }
    
    // Store parameters for callback
    PoolKey private _poolKey;
    ModifyLiquidityParams private _params;
    address private _sender;
    
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    );
    
    constructor(address _poolManager) {
        poolManager = _poolManager;
    }
    
    /**
     * @notice Add liquidity to a V4 pool
     * @param key The pool key identifying the pool
     * @param params The liquidity parameters
     */
    function addLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params
    ) external returns (int256 liquidityDelta) {
        require(params.liquidityDelta > 0, "Liquidity delta must be positive");
        
        // Store params for callback
        _poolKey = key;
        _params = params;
        _sender = msg.sender;
        
        // Transfer tokens from sender to this contract
        if (params.amount0Max > 0) {
            IERC20(key.currency0).transferFrom(msg.sender, address(this), params.amount0Max);
        }
        if (params.amount1Max > 0) {
            IERC20(key.currency1).transferFrom(msg.sender, address(this), params.amount1Max);
        }
        
        // Call unlock on PoolManager
        bytes memory data = abi.encode(true); // true = add liquidity
        (bool success, bytes memory result) = poolManager.call(
            abi.encodeWithSignature("unlock(bytes)", data)
        );
        
        require(success, "Unlock failed");
        liquidityDelta = abi.decode(result, (int256));
        
        // Emit event
        bytes32 poolId = keccak256(abi.encode(key));
        emit LiquidityAdded(poolId, msg.sender, params.tickLower, params.tickUpper, liquidityDelta);
        
        return liquidityDelta;
    }
    
    /**
     * @notice Callback function called by PoolManager during unlock
     * @param data The callback data
     * @return The result of the callback
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == poolManager, "Only PoolManager can call");
        
        bool isAdd = abi.decode(data, (bool));
        require(isAdd, "Only add liquidity supported");
        
        // Prepare modifyLiquidity call
        bytes memory modifyData = abi.encodeWithSignature(
            "modifyLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes),bytes)",
            _poolKey,
            _params.tickLower,
            _params.tickUpper,
            _params.liquidityDelta,
            bytes(""), // hookData
            bytes("")  // empty bytes
        );
        
        // Call modifyLiquidity on PoolManager
        (bool success, bytes memory result) = poolManager.call(modifyData);
        require(success, "ModifyLiquidity failed");
        
        // Decode balance deltas from result
        (int256 delta0, int256 delta1) = abi.decode(result, (int256, int256));
        
        // Handle settlements
        if (delta0 > 0) {
            // We owe token0 to the pool
            IERC20(_poolKey.currency0).transfer(poolManager, uint256(delta0));
        } else if (delta0 < 0) {
            // Pool owes us token0
            // In V4, we need to call "take" to withdraw
        }
        
        if (delta1 > 0) {
            // We owe token1 to the pool
            IERC20(_poolKey.currency1).transfer(poolManager, uint256(delta1));
        } else if (delta1 < 0) {
            // Pool owes us token1
        }
        
        // Return the liquidity delta
        return abi.encode(_params.liquidityDelta);
    }
    
    /**
     * @notice Withdraw any remaining tokens
     */
    function withdraw(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(_sender, balance);
        }
    }
}
