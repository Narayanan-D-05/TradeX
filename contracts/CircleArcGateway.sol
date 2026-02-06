// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title CircleArcGateway
 * @notice Enhanced gateway integrating Circle tools for USDC cross-chain transfers
 * @dev Circle Gateway integration for TradeX competition
 * 
 * Circle Tools Integration:
 * - USDC as primary cross-chain token
 * - Circle Gateway message passing
 * - Programmable wallet support
 * - Arc network USDC flows
 * 
 * Competition Features:
 * - Cross-chain USDC transfers (Sepolia ↔ Arc)
 * - INR/AED stablecoin conversion via USDC
 * - Circle Gateway API integration point
 * - Programmable wallet compatibility
 */
contract CircleArcGateway {
    
    // ============ Structs ============
    
    struct CircleTransfer {
        bytes32 transferId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 sourceChain;
        uint256 destinationChain;
        address sourceToken;
        address destinationToken;
        uint256 timestamp;
        TransferStatus status;
        bytes32 circleMessageHash;
    }
    
    struct CrossChainMessage {
        bytes32 messageId;
        uint256 sourceChain;
        uint256 destinationChain;
        address sender;
        bytes payload;
        uint256 timestamp;
        bool executed;
    }
    
    enum TransferStatus {
        PENDING,
        IN_TRANSIT,
        COMPLETED,
        FAILED
    }
    
    // ============ State ============
    
    address public owner;
    address public usdc;           // Circle USDC token contract
    address public inrStable;      // INR-pegged stablecoin (6 decimals)
    address public aedStable;      // AED-pegged stablecoin (6 decimals)
    
    // Circle Gateway integration
    mapping(bytes32 => CircleTransfer) public circleTransfers;
    mapping(bytes32 => CrossChainMessage) public crossChainMessages;
    mapping(address => bool) public authorizedRelayers;
    
    // Liquidity pools for stablecoin conversion
    mapping(address => uint256) public liquidityBalances; // token => balance
    uint256 public totalUSDCLiquidity;
    
    // Exchange rates (stored with 6 decimals precision)
    uint256 public inrToUsdRate = 12000;    // 1 INR = 0.012000 USD
    uint256 public aedToUsdRate = 272000;   // 1 AED = 0.272000 USD
    uint256 public constant RATE_DECIMALS = 6;
    
    // Fees (basis points)
    uint256 public bridgeFee = 200;  // 2% for cross-chain
    uint256 public swapFee = 50;     // 0.5% for token conversion
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Circle Gateway configuration
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant ARC_CHAIN_ID = 111551119; // Arc testnet
    
    // ============ Events ============
    
    event CircleTransferInitiated(
        bytes32 indexed transferId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 sourceChain,
        uint256 destinationChain
    );
    
    event CircleTransferCompleted(
        bytes32 indexed transferId,
        bytes32 indexed circleMessageHash,
        uint256 amount
    );
    
    event StablecoinConverted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event CrossChainMessageSent(
        bytes32 indexed messageId,
        uint256 indexed destinationChain,
        address indexed sender,
        bytes payload
    );
    
    event LiquidityAdded(
        address indexed provider,
        address indexed token,
        uint256 amount
    );
    
    // ============ Errors ============
    
    error OnlyOwner();
    error OnlyRelayer();
    error UnsupportedChain();
    error InsufficientLiquidity();
    error InvalidAmount();
    error TransferFailed();
    error InvalidExchangeRate();
    error TransferNotFound();
    error UnauthorizedAccess();
    
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
    
    constructor(
        address _usdc,
        address _inrStable,
        address _aedStable
    ) {
        owner = msg.sender;
        usdc = _usdc;
        inrStable = _inrStable;
        aedStable = _aedStable;
        
        // Owner is authorized relayer by default
        authorizedRelayers[msg.sender] = true;
    }
    
    // ============ Circle Gateway Integration ============
    
    /**
     * @notice Initiate cross-chain USDC transfer using Circle Gateway
     * @param recipient Destination address on target chain
     * @param amount USDC amount (6 decimals)
     * @param destinationChain Target chain ID
     */
    function initiateCircleTransfer(
        address recipient,
        uint256 amount,
        uint256 destinationChain
    ) external returns (bytes32 transferId) {
        if (amount == 0) revert InvalidAmount();
        if (destinationChain != SEPOLIA_CHAIN_ID && destinationChain != ARC_CHAIN_ID) {
            revert UnsupportedChain();
        }
        
        // Generate unique transfer ID
        transferId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                amount,
                block.chainid,
                destinationChain,
                block.timestamp
            )
        );
        
        // Transfer USDC from user
        IERC20(usdc).transferFrom(msg.sender, address(this), amount);
        
        // Calculate fees
        uint256 fee = (amount * bridgeFee) / FEE_DENOMINATOR;
        uint256 netAmount = amount - fee;
        
        // Store transfer details
        circleTransfers[transferId] = CircleTransfer({
            transferId: transferId,
            sender: msg.sender,
            recipient: recipient,
            amount: netAmount,
            sourceChain: block.chainid,
            destinationChain: destinationChain,
            sourceToken: usdc,
            destinationToken: usdc, // Same USDC on destination
            timestamp: block.timestamp,
            status: TransferStatus.PENDING,
            circleMessageHash: bytes32(0)
        });
        
        emit CircleTransferInitiated(
            transferId,
            msg.sender,
            recipient,
            netAmount,
            block.chainid,
            destinationChain
        );
        
        return transferId;
    }
    
    /**
     * @notice Complete Circle transfer (called by authorized relayer)
     * @param transferId The transfer to complete
     * @param circleMessageHash Hash from Circle Gateway
     */
    function completeCircleTransfer(
        bytes32 transferId,
        bytes32 circleMessageHash
    ) external onlyRelayer {
        CircleTransfer storage transfer = circleTransfers[transferId];
        
        if (transfer.transferId == bytes32(0)) revert TransferNotFound();
        if (transfer.status != TransferStatus.PENDING) revert TransferFailed();
        
        // Update status
        transfer.status = TransferStatus.COMPLETED;
        transfer.circleMessageHash = circleMessageHash;
        
        // For Arc chain, mint USDC to recipient (simulated)
        if (transfer.destinationChain == ARC_CHAIN_ID) {
            // In production, this would trigger actual Circle Gateway completion
            totalUSDCLiquidity += transfer.amount;
        }
        
        emit CircleTransferCompleted(transferId, circleMessageHash, transfer.amount);
    }
    
    // ============ Stablecoin Conversion ============
    
    /**
     * @notice Convert INR stablecoin to USDC
     * @param inrAmount Amount of INR to convert
     * @return usdcAmount Amount of USDC received
     */
    function convertINRtoUSDC(uint256 inrAmount) external returns (uint256 usdcAmount) {
        if (inrAmount == 0) revert InvalidAmount();
        
        // Calculate USDC equivalent: INR * rate / 10^6
        usdcAmount = (inrAmount * inrToUsdRate) / (10 ** RATE_DECIMALS);
        
        // Apply swap fee
        uint256 fee = (usdcAmount * swapFee) / FEE_DENOMINATOR;
        usdcAmount -= fee;
        
        // Check liquidity
        if (usdcAmount > IERC20(usdc).balanceOf(address(this))) {
            revert InsufficientLiquidity();
        }
        
        // Execute conversion
        IERC20(inrStable).transferFrom(msg.sender, address(this), inrAmount);
        IERC20(usdc).transfer(msg.sender, usdcAmount);
        
        emit StablecoinConverted(msg.sender, inrStable, usdc, inrAmount, usdcAmount);
    }
    
    /**
     * @notice Convert AED stablecoin to USDC
     * @param aedAmount Amount of AED to convert
     * @return usdcAmount Amount of USDC received
     */
    function convertAEDtoUSDC(uint256 aedAmount) external returns (uint256 usdcAmount) {
        if (aedAmount == 0) revert InvalidAmount();
        
        // Calculate USDC equivalent: AED * rate / 10^6
        usdcAmount = (aedAmount * aedToUsdRate) / (10 ** RATE_DECIMALS);
        
        // Apply swap fee
        uint256 fee = (usdcAmount * swapFee) / FEE_DENOMINATOR;
        usdcAmount -= fee;
        
        // Check liquidity
        if (usdcAmount > IERC20(usdc).balanceOf(address(this))) {
            revert InsufficientLiquidity();
        }
        
        // Execute conversion
        IERC20(aedStable).transferFrom(msg.sender, address(this), aedAmount);
        IERC20(usdc).transfer(msg.sender, usdcAmount);
        
        emit StablecoinConverted(msg.sender, aedStable, usdc, aedAmount, usdcAmount);
    }
    
    /**
     * @notice Convert USDC to INR stablecoin
     * @param usdcAmount Amount of USDC to convert
     * @return inrAmount Amount of INR received
     */
    function convertUSDCtoINR(uint256 usdcAmount) external returns (uint256 inrAmount) {
        if (usdcAmount == 0) revert InvalidAmount();
        
        // Calculate INR equivalent: USDC * 10^6 / rate
        inrAmount = (usdcAmount * (10 ** RATE_DECIMALS)) / inrToUsdRate;
        
        // Apply swap fee
        uint256 fee = (inrAmount * swapFee) / FEE_DENOMINATOR;
        inrAmount -= fee;
        
        // Check liquidity
        if (inrAmount > IERC20(inrStable).balanceOf(address(this))) {
            revert InsufficientLiquidity();
        }
        
        // Execute conversion
        IERC20(usdc).transferFrom(msg.sender, address(this), usdcAmount);
        IERC20(inrStable).transfer(msg.sender, inrAmount);
        
        emit StablecoinConverted(msg.sender, usdc, inrStable, usdcAmount, inrAmount);
    }
    
    /**
     * @notice Convert USDC to AED stablecoin
     * @param usdcAmount Amount of USDC to convert
     * @return aedAmount Amount of AED received
     */
    function convertUSDCtoAED(uint256 usdcAmount) external returns (uint256 aedAmount) {
        if (usdcAmount == 0) revert InvalidAmount();
        
        // Calculate AED equivalent: USDC * 10^6 / rate
        aedAmount = (usdcAmount * (10 ** RATE_DECIMALS)) / aedToUsdRate;
        
        // Apply swap fee
        uint256 fee = (aedAmount * swapFee) / FEE_DENOMINATOR;
        aedAmount -= fee;
        
        // Check liquidity
        if (aedAmount > IERC20(aedStable).balanceOf(address(this))) {
            revert InsufficientLiquidity();
        }
        
        // Execute conversion
        IERC20(usdc).transferFrom(msg.sender, address(this), usdcAmount);
        IERC20(aedStable).transfer(msg.sender, aedAmount);
        
        emit StablecoinConverted(msg.sender, usdc, aedStable, usdcAmount, aedAmount);
    }
    
    // ============ Liquidity Management ============
    
    /**
     * @notice Add liquidity to enable conversions
     * @param token Token address (USDC, INR, or AED)
     * @param amount Amount to add
     */
    function addLiquidity(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (token != usdc && token != inrStable && token != aedStable) {
            revert InvalidAmount();
        }
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        liquidityBalances[token] += amount;
        
        if (token == usdc) {
            totalUSDCLiquidity += amount;
        }
        
        emit LiquidityAdded(msg.sender, token, amount);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update exchange rates
     */
    function updateRates(uint256 _inrToUsdRate, uint256 _aedToUsdRate) external onlyOwner {
        if (_inrToUsdRate == 0 || _aedToUsdRate == 0) revert InvalidExchangeRate();
        
        inrToUsdRate = _inrToUsdRate;
        aedToUsdRate = _aedToUsdRate;
    }
    
    /**
     * @notice Add/remove authorized relayers for Circle Gateway
     */
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
    }
    
    /**
     * @notice Get transfer details
     */
    function getTransfer(bytes32 transferId) external view returns (CircleTransfer memory) {
        return circleTransfers[transferId];
    }
    
    /**
     * @notice Calculate conversion amounts
     */
    function calculateConversion(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 fee) {
        if (tokenIn == inrStable && tokenOut == usdc) {
            amountOut = (amountIn * inrToUsdRate) / (10 ** RATE_DECIMALS);
        } else if (tokenIn == aedStable && tokenOut == usdc) {
            amountOut = (amountIn * aedToUsdRate) / (10 ** RATE_DECIMALS);
        } else if (tokenIn == usdc && tokenOut == inrStable) {
            amountOut = (amountIn * (10 ** RATE_DECIMALS)) / inrToUsdRate;
        } else if (tokenIn == usdc && tokenOut == aedStable) {
            amountOut = (amountIn * (10 ** RATE_DECIMALS)) / aedToUsdRate;
        } else {
            revert InvalidAmount();
        }
        
        fee = (amountOut * swapFee) / FEE_DENOMINATOR;
        amountOut -= fee;
    }
}