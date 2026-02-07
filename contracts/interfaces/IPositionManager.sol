// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
    
    function nextTokenId() external view returns (uint256);
}
