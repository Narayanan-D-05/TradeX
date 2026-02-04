// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./TradeXBridge.sol";
import "./TradeXOracle.sol";
import "./ArcGateway.sol";
import "./ComplianceGuard.sol";

/**
 * @title TradeX
 * @notice Main orchestrator contract for INR↔AED atomic bridge
 * @dev Coordinates all TradeX components for seamless 1-click swaps
 * 
 * Components:
 * - TradeXBridge: HTLC atomic swaps
 * - TradeXOracle: INR/AED price feeds
 * - ArcGateway: USDC liquidity hub
 * - ComplianceGuard: KYC/FEMA gates
 * 
 * Primary Use Cases:
 * 1. Fund DFM Broker: ₹10L → 446K AED in broker account (45s)
 * 2. Send Home: AED 5K → ₹1.1L in UPI (20s)
 */
contract TradeX {
    
    // ============ Structs ============
    
    struct SwapOrder {
        address user;
        uint256 inrAmount;
        uint256 aedAmount;
        uint256 usdcAmount;
        uint256 timestamp;
        SwapStatus status;
        SwapType swapType;
    }
    
    enum SwapStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED,
        REFUNDED
    }
    
    enum SwapType {
        INR_TO_AED,  // Fund broker
        AED_TO_INR   // Send home
    }
    
    // ============ State ============
    
    address public owner;
    
    // Component contracts
    TradeXBridge public bridge;
    TradeXOracle public oracle;
    ArcGateway public arcGateway;
    ComplianceGuard public compliance;
    
    // Token addresses
    address public inrStable;
    address public aedStable;
    address public usdc;
    
    // Order tracking
    mapping(bytes32 => SwapOrder) public orders;
    mapping(address => bytes32[]) public userOrders;
    uint256 public orderCount;
    
    // Fee configuration (basis points)
    uint256 public platformFee = 30; // 0.3%
    address public feeCollector;
    
    // Stats
    uint256 public totalVolumeUSD;
    uint256 public totalSwaps;
    
    // ============ Events ============
    
    event SwapInitiated(
        bytes32 indexed orderId,
        address indexed user,
        SwapType swapType,
        uint256 amountIn,
        uint256 expectedOut
    );
    
    event SwapCompleted(
        bytes32 indexed orderId,
        address indexed user,
        uint256 amountOut,
        uint256 fee
    );
    
    event SwapFailed(bytes32 indexed orderId, string reason);
    
    event BrokerFunded(
        address indexed user,
        address indexed broker,
        uint256 aedAmount
    );
    
    event RemittanceSent(
        address indexed sender,
        address indexed recipient,
        uint256 inrAmount
    );
    
    // ============ Errors ============
    
    error OnlyOwner();
    error InvalidAmount();
    error ComplianceCheckFailed();
    error SwapExecutionFailed();
    error TransferFailed();
    error OrderNotFound();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _bridge,
        address _oracle,
        address _arcGateway,
        address _compliance,
        address _inrStable,
        address _aedStable,
        address _usdc
    ) {
        owner = msg.sender;
        feeCollector = msg.sender;
        
        bridge = TradeXBridge(_bridge);
        oracle = TradeXOracle(_oracle);
        arcGateway = ArcGateway(payable(_arcGateway));
        compliance = ComplianceGuard(_compliance);
        
        inrStable = _inrStable;
        aedStable = _aedStable;
        usdc = _usdc;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice 1-Click: Fund DFM/ADX broker with INR
     * @dev INR-stable → USDC → AED-stable → Broker Account
     * @param _inrAmount Amount in INR (18 decimals)
     * @param _brokerAddress Mock broker address to credit
     * @return orderId Order tracking ID
     * @return aedAmount AED credited to broker
     */
    function fundBroker(
        uint256 _inrAmount,
        address _brokerAddress
    ) external returns (bytes32 orderId, uint256 aedAmount) {
        if (_inrAmount == 0) revert InvalidAmount();
        
        // 1. Compliance check
        (bool canTransact,) = compliance.canTransact(msg.sender, _inrAmount);
        if (!canTransact) revert ComplianceCheckFailed();
        
        // 2. Transfer INR from user
        bool success = IERC20(inrStable).transferFrom(msg.sender, address(this), _inrAmount);
        if (!success) revert TransferFailed();
        
        // 3. Calculate conversion (INR → USDC → AED)
        uint256 usdcAmount = _inrToUsdc(_inrAmount);
        aedAmount = _usdcToAed(usdcAmount);
        
        // 4. Apply platform fee
        uint256 fee = (aedAmount * platformFee) / 10000;
        aedAmount -= fee;
        
        // 5. Create order
        orderId = _createOrder(msg.sender, _inrAmount, aedAmount, usdcAmount, SwapType.INR_TO_AED);
        
        // 6. Credit AED to broker (mock)
        orders[orderId].status = SwapStatus.COMPLETED;
        
        emit SwapInitiated(orderId, msg.sender, SwapType.INR_TO_AED, _inrAmount, aedAmount);
        emit SwapCompleted(orderId, msg.sender, aedAmount, fee);
        emit BrokerFunded(msg.sender, _brokerAddress, aedAmount);
        
        totalSwaps++;
        totalVolumeUSD += usdcAmount;
    }
    
    /**
     * @notice 1-Click: Send AED home to India as INR
     * @dev AED-stable → USDC → INR-stable → Recipient
     * @param _aedAmount Amount in AED (18 decimals)
     * @param _recipient INR recipient address
     * @return orderId Order tracking ID
     * @return inrAmount INR sent to recipient
     */
    function sendHome(
        uint256 _aedAmount,
        address _recipient
    ) external returns (bytes32 orderId, uint256 inrAmount) {
        if (_aedAmount == 0) revert InvalidAmount();
        
        // 1. Compliance check
        (bool canTransact,) = compliance.canTransact(msg.sender, _aedAmount);
        if (!canTransact) revert ComplianceCheckFailed();
        
        // 2. Transfer AED from user
        bool success = IERC20(aedStable).transferFrom(msg.sender, address(this), _aedAmount);
        if (!success) revert TransferFailed();
        
        // 3. Calculate conversion (AED → USDC → INR)
        uint256 usdcAmount = _aedToUsdc(_aedAmount);
        inrAmount = _usdcToInr(usdcAmount);
        
        // 4. Apply platform fee
        uint256 fee = (inrAmount * platformFee) / 10000;
        inrAmount -= fee;
        
        // 5. Create order
        orderId = _createOrder(msg.sender, inrAmount, _aedAmount, usdcAmount, SwapType.AED_TO_INR);
        
        // 6. Transfer INR to recipient
        success = IERC20(inrStable).transfer(_recipient, inrAmount);
        if (!success) revert TransferFailed();
        
        orders[orderId].status = SwapStatus.COMPLETED;
        
        emit SwapInitiated(orderId, msg.sender, SwapType.AED_TO_INR, _aedAmount, inrAmount);
        emit SwapCompleted(orderId, msg.sender, inrAmount, fee);
        emit RemittanceSent(msg.sender, _recipient, inrAmount);
        
        totalSwaps++;
        totalVolumeUSD += usdcAmount;
    }
    
    /**
     * @notice Get live swap quote
     * @param _amount Input amount
     * @param _inrToAed Direction: true = INR→AED, false = AED→INR
     * @return outputAmount Expected output after fees
     * @return fee Platform fee amount
     * @return rate Current exchange rate
     */
    function getQuote(
        uint256 _amount,
        bool _inrToAed
    ) external view returns (uint256 outputAmount, uint256 fee, int256 rate) {
        rate = oracle.getLatestPrice(oracle.INR_AED());
        
        if (_inrToAed) {
            uint256 usdcAmount = _inrToUsdc(_amount);
            outputAmount = _usdcToAed(usdcAmount);
        } else {
            uint256 usdcAmount = _aedToUsdc(_amount);
            outputAmount = _usdcToInr(usdcAmount);
        }
        
        fee = (outputAmount * platformFee) / 10000;
        outputAmount -= fee;
    }
    
    // ============ Admin Functions ============
    
    function setComponents(
        address _bridge,
        address _oracle,
        address _arcGateway,
        address _compliance
    ) external onlyOwner {
        bridge = TradeXBridge(_bridge);
        oracle = TradeXOracle(_oracle);
        arcGateway = ArcGateway(payable(_arcGateway));
        compliance = ComplianceGuard(_compliance);
    }
    
    function setTokens(
        address _inrStable,
        address _aedStable,
        address _usdc
    ) external onlyOwner {
        inrStable = _inrStable;
        aedStable = _aedStable;
        usdc = _usdc;
    }
    
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 100, "Fee too high"); // Max 1%
        platformFee = _fee;
    }
    
    function setFeeCollector(address _collector) external onlyOwner {
        feeCollector = _collector;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
    
    function withdrawFees(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(feeCollector, balance);
    }
    
    // ============ View Functions ============
    
    function getOrder(bytes32 _orderId) external view returns (SwapOrder memory) {
        return orders[_orderId];
    }
    
    function getUserOrders(address _user) external view returns (bytes32[] memory) {
        return userOrders[_user];
    }
    
    function getStats() external view returns (
        uint256 totalVolume,
        uint256 swapCount,
        int256 currentRate
    ) {
        return (
            totalVolumeUSD,
            totalSwaps,
            oracle.getLatestPrice(oracle.INR_AED())
        );
    }
    
    // ============ Internal Functions ============
    
    function _createOrder(
        address _user,
        uint256 _inrAmount,
        uint256 _aedAmount,
        uint256 _usdcAmount,
        SwapType _type
    ) internal returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(
            _user,
            _inrAmount,
            block.timestamp,
            orderCount++
        ));
        
        orders[orderId] = SwapOrder({
            user: _user,
            inrAmount: _inrAmount,
            aedAmount: _aedAmount,
            usdcAmount: _usdcAmount,
            timestamp: block.timestamp,
            status: SwapStatus.PROCESSING,
            swapType: _type
        });
        
        userOrders[_user].push(orderId);
    }
    
    function _inrToUsdc(uint256 _inrAmount) internal view returns (uint256) {
        // INR/USD rate from oracle (8 decimals)
        int256 rate = oracle.getLatestPrice(oracle.INR_USD());
        // Rate is 0.01198 = 1198000 with 8 decimals
        return (_inrAmount * uint256(rate)) / 1e8;
    }
    
    function _usdcToInr(uint256 _usdcAmount) internal view returns (uint256) {
        int256 rate = oracle.getLatestPrice(oracle.USD_INR());
        // Rate is 83.5 = 8350000000 with 8 decimals
        return (_usdcAmount * uint256(rate)) / 1e8;
    }
    
    function _usdcToAed(uint256 _usdcAmount) internal view returns (uint256) {
        int256 rate = oracle.getLatestPrice(oracle.USD_AED());
        // Rate is 3.67 = 367000000 with 8 decimals
        return (_usdcAmount * uint256(rate)) / 1e8;
    }
    
    function _aedToUsdc(uint256 _aedAmount) internal view returns (uint256) {
        int256 rate = oracle.getLatestPrice(oracle.AED_USD());
        // Rate is 0.2725 = 27250000 with 8 decimals
        return (_aedAmount * uint256(rate)) / 1e8;
    }
    
    // ============ Receive ============
    
    receive() external payable {}
}
