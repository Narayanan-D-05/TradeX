// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title YellowAdapter
 * @notice Gasless session management using Yellow Network's Nitrolite Protocol pattern
 * @dev Implements ERC-7824 state channel concepts for meta-transactions
 * 
 * How it works:
 * 1. User opens session with deposit (covers gas for N transactions)
 * 2. User signs off-chain transactions
 * 3. Relayer submits transactions, gas paid from session deposit
 * 4. User closes session, remaining deposit refunded
 */
contract YellowAdapter {
    
    // ============ Structs ============
    
    struct Session {
        address user;
        uint256 deposit;
        uint256 spent;
        uint256 nonce;
        uint256 expiry;
        bool active;
    }
    
    struct MetaTransaction {
        address to;
        uint256 value;
        bytes data;
        uint256 nonce;
        uint256 deadline;
    }
    
    // ============ State ============
    
    mapping(address => Session) public sessions;
    mapping(address => bool) public authorizedRelayers;
    
    address public owner;
    uint256 public minDeposit = 0.01 ether;
    uint256 public maxSessionDuration = 24 hours;
    uint256 public gasOverhead = 50000; // Base gas for meta-tx execution
    
    // EIP-712 Domain
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant META_TX_TYPEHASH = keccak256(
        "MetaTransaction(address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)"
    );
    
    // ============ Events ============
    
    event SessionOpened(address indexed user, uint256 deposit, uint256 expiry);
    event SessionClosed(address indexed user, uint256 refunded);
    event GaslessExecuted(address indexed user, address indexed to, uint256 gasUsed);
    event RelayerUpdated(address indexed relayer, bool authorized);
    
    // ============ Errors ============
    
    error OnlyOwner();
    error OnlyRelayer();
    error InsufficientDeposit();
    error SessionNotActive();
    error SessionAlreadyActive();
    error SessionExpired();
    error InvalidSignature();
    error InvalidNonce();
    error DeadlineExpired();
    error ExecutionFailed();
    error InsufficientSessionBalance();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender] && msg.sender != owner) revert OnlyRelayer();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        authorizedRelayers[msg.sender] = true;
        
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("TradeX Yellow Adapter"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }
    
    // ============ Session Management ============
    
    /**
     * @notice Open a gasless session with ETH deposit
     * @param _duration Session duration in seconds
     */
    function openSession(uint256 _duration) external payable {
        if (msg.value < minDeposit) revert InsufficientDeposit();
        if (sessions[msg.sender].active) revert SessionAlreadyActive();
        if (_duration > maxSessionDuration) _duration = maxSessionDuration;
        
        sessions[msg.sender] = Session({
            user: msg.sender,
            deposit: msg.value,
            spent: 0,
            nonce: 0,
            expiry: block.timestamp + _duration,
            active: true
        });
        
        emit SessionOpened(msg.sender, msg.value, block.timestamp + _duration);
    }
    
    /**
     * @notice Close session and refund remaining deposit
     */
    function closeSession() external {
        Session storage session = sessions[msg.sender];
        if (!session.active) revert SessionNotActive();
        
        uint256 refund = session.deposit - session.spent;
        session.active = false;
        
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            if (!success) revert ExecutionFailed();
        }
        
        emit SessionClosed(msg.sender, refund);
    }
    
    /**
     * @notice Top up an existing session
     */
    function topUpSession() external payable {
        Session storage session = sessions[msg.sender];
        if (!session.active) revert SessionNotActive();
        if (block.timestamp >= session.expiry) revert SessionExpired();
        
        session.deposit += msg.value;
    }
    
    // ============ Gasless Execution ============
    
    /**
     * @notice Execute a meta-transaction on behalf of user
     * @param _user User address
     * @param _tx Meta-transaction details
     * @param _signature User's EIP-712 signature
     */
    function executeGasless(
        address _user,
        MetaTransaction calldata _tx,
        bytes calldata _signature
    ) external onlyRelayer returns (bool success, bytes memory result) {
        Session storage session = sessions[_user];
        
        if (!session.active) revert SessionNotActive();
        if (block.timestamp >= session.expiry) revert SessionExpired();
        if (_tx.nonce != session.nonce) revert InvalidNonce();
        if (block.timestamp > _tx.deadline) revert DeadlineExpired();
        
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            META_TX_TYPEHASH,
            _tx.to,
            _tx.value,
            keccak256(_tx.data),
            _tx.nonce,
            _tx.deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        
        address signer = _recoverSigner(digest, _signature);
        if (signer != _user) revert InvalidSignature();
        
        uint256 gasBefore = gasleft();
        
        // Execute the transaction
        (success, result) = _tx.to.call{value: _tx.value}(_tx.data);
        if (!success) revert ExecutionFailed();
        
        // Calculate and deduct gas cost
        uint256 gasUsed = gasBefore - gasleft() + gasOverhead;
        uint256 gasCost = gasUsed * tx.gasprice;
        
        if (session.deposit - session.spent < gasCost) revert InsufficientSessionBalance();
        session.spent += gasCost;
        session.nonce++;
        
        emit GaslessExecuted(_user, _tx.to, gasUsed);
    }
    
    // ============ Admin Functions ============
    
    function setRelayer(address _relayer, bool _authorized) external onlyOwner {
        authorizedRelayers[_relayer] = _authorized;
        emit RelayerUpdated(_relayer, _authorized);
    }
    
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        minDeposit = _minDeposit;
    }
    
    function setMaxSessionDuration(uint256 _maxDuration) external onlyOwner {
        maxSessionDuration = _maxDuration;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
    
    // Withdraw relayer earnings
    function withdrawRelayerFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        if (!success) revert ExecutionFailed();
    }
    
    // ============ View Functions ============
    
    function getSession(address _user) external view returns (Session memory) {
        return sessions[_user];
    }
    
    function getSessionBalance(address _user) external view returns (uint256) {
        Session storage session = sessions[_user];
        if (!session.active) return 0;
        return session.deposit - session.spent;
    }
    
    function isSessionActive(address _user) external view returns (bool) {
        Session storage session = sessions[_user];
        return session.active && block.timestamp < session.expiry;
    }
    
    // ============ Internal Functions ============
    
    function _recoverSigner(bytes32 _digest, bytes calldata _signature) internal pure returns (address) {
        require(_signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(_signature.offset)
            s := calldataload(add(_signature.offset, 32))
            v := byte(0, calldataload(add(_signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        
        return ecrecover(_digest, v, r, s);
    }
    
    // ============ Receive ============
    
    receive() external payable {}
}
