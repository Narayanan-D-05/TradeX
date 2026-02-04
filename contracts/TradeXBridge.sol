// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TradeXBridge
 * @notice HTLC (Hash Time-Locked Contract) for atomic INR↔AED swaps
 * @dev Enables trustless cross-chain swaps with cryptographic guarantees
 * 
 * Flow:
 * 1. Initiator locks funds with hashlock + timelock
 * 2. Counterparty completes swap by revealing preimage
 * 3. If timelock expires, initiator can refund
 */
contract TradeXBridge {
    
    // ============ Structs ============
    
    struct Swap {
        address initiator;
        address recipient;
        address token;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool completed;
        bool refunded;
    }
    
    // ============ State ============
    
    mapping(bytes32 => Swap) public swaps;
    mapping(address => bytes32[]) public userSwaps;
    
    uint256 public swapCount;
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 7 days;
    
    // ============ Events ============
    
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed recipient,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event SwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        bytes32 preimage
    );
    
    event SwapRefunded(
        bytes32 indexed swapId,
        address indexed initiator
    );
    
    // ============ Errors ============
    
    error InvalidTimelock();
    error InvalidAmount();
    error SwapAlreadyExists();
    error SwapNotFound();
    error SwapAlreadyCompleted();
    error SwapAlreadyRefunded();
    error InvalidPreimage();
    error TimelockNotExpired();
    error TimelockExpired();
    error TransferFailed();
    error NotInitiator();
    
    // ============ External Functions ============
    
    /**
     * @notice Initiate a new atomic swap
     * @param _recipient Address to receive funds on swap completion
     * @param _token ERC20 token address (address(0) for native token)
     * @param _hashlock SHA256 hash of the secret preimage
     * @param _timelock Unix timestamp when refund becomes available
     * @return swapId Unique identifier for this swap
     */
    function initiateSwap(
        address _recipient,
        address _token,
        bytes32 _hashlock,
        uint256 _timelock
    ) external payable returns (bytes32 swapId) {
        uint256 amount = msg.value;
        
        if (amount == 0) revert InvalidAmount();
        if (_timelock < block.timestamp + MIN_TIMELOCK) revert InvalidTimelock();
        if (_timelock > block.timestamp + MAX_TIMELOCK) revert InvalidTimelock();
        
        swapId = keccak256(abi.encodePacked(
            msg.sender,
            _recipient,
            _token,
            amount,
            _hashlock,
            _timelock,
            swapCount++
        ));
        
        if (swaps[swapId].initiator != address(0)) revert SwapAlreadyExists();
        
        swaps[swapId] = Swap({
            initiator: msg.sender,
            recipient: _recipient,
            token: _token,
            amount: amount,
            hashlock: _hashlock,
            timelock: _timelock,
            completed: false,
            refunded: false
        });
        
        userSwaps[msg.sender].push(swapId);
        userSwaps[_recipient].push(swapId);
        
        emit SwapInitiated(
            swapId,
            msg.sender,
            _recipient,
            _token,
            amount,
            _hashlock,
            _timelock
        );
    }
    
    /**
     * @notice Complete a swap by revealing the preimage
     * @param _swapId Unique swap identifier
     * @param _preimage Secret that hashes to the hashlock
     */
    function completeSwap(bytes32 _swapId, bytes32 _preimage) external {
        Swap storage swap = swaps[_swapId];
        
        if (swap.initiator == address(0)) revert SwapNotFound();
        if (swap.completed) revert SwapAlreadyCompleted();
        if (swap.refunded) revert SwapAlreadyRefunded();
        if (block.timestamp >= swap.timelock) revert TimelockExpired();
        if (sha256(abi.encodePacked(_preimage)) != swap.hashlock) revert InvalidPreimage();
        
        swap.completed = true;
        
        // Transfer funds to recipient
        (bool success, ) = swap.recipient.call{value: swap.amount}("");
        if (!success) revert TransferFailed();
        
        emit SwapCompleted(_swapId, swap.recipient, _preimage);
    }
    
    /**
     * @notice Refund a swap after timelock expires
     * @param _swapId Unique swap identifier
     */
    function refund(bytes32 _swapId) external {
        Swap storage swap = swaps[_swapId];
        
        if (swap.initiator == address(0)) revert SwapNotFound();
        if (swap.completed) revert SwapAlreadyCompleted();
        if (swap.refunded) revert SwapAlreadyRefunded();
        if (block.timestamp < swap.timelock) revert TimelockNotExpired();
        if (msg.sender != swap.initiator) revert NotInitiator();
        
        swap.refunded = true;
        
        // Refund to initiator
        (bool success, ) = swap.initiator.call{value: swap.amount}("");
        if (!success) revert TransferFailed();
        
        emit SwapRefunded(_swapId, swap.initiator);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get swap details
     */
    function getSwap(bytes32 _swapId) external view returns (Swap memory) {
        return swaps[_swapId];
    }
    
    /**
     * @notice Get all swaps for a user
     */
    function getUserSwaps(address _user) external view returns (bytes32[] memory) {
        return userSwaps[_user];
    }
    
    /**
     * @notice Check if a swap can be completed with given preimage
     */
    function canComplete(bytes32 _swapId, bytes32 _preimage) external view returns (bool) {
        Swap storage swap = swaps[_swapId];
        return !swap.completed && 
               !swap.refunded && 
               block.timestamp < swap.timelock &&
               sha256(abi.encodePacked(_preimage)) == swap.hashlock;
    }
    
    /**
     * @notice Check if a swap can be refunded
     */
    function canRefund(bytes32 _swapId) external view returns (bool) {
        Swap storage swap = swaps[_swapId];
        return !swap.completed && 
               !swap.refunded && 
               block.timestamp >= swap.timelock;
    }
}
