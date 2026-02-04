// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";

/**
 * @title ArcGateway
 * @notice USDC liquidity hub for Arc network integration
 * @dev Manages USDC deposits and AED-stable minting for TradeX corridor
 * 
 * Arc uses USDC as native gas token. This gateway:
 * 1. Accepts USDC deposits from users
 * 2. Mints mock AED-stable tokens for demo
 * 3. Manages liquidity pool for INR↔AED swaps
 */
contract ArcGateway {
    
    // ============ Structs ============
    
    struct Deposit {
        address depositor;
        uint256 usdcAmount;
        uint256 aedAmount;
        uint256 timestamp;
        bool withdrawn;
    }
    
    // ============ State ============
    
    address public owner;
    address public usdc;       // USDC token address
    address public aedStable;  // Mock AED-stable token
    address public oracle;     // TradeXOracle address
    
    mapping(bytes32 => Deposit) public deposits;
    mapping(address => uint256) public userBalancesUSDC;
    mapping(address => uint256) public userBalancesAED;
    
    uint256 public totalLiquidityUSDC;
    uint256 public totalLiquidityAED;
    uint256 public depositCount;
    
    // Exchange rate: 1 USDC = 3.67 AED (stored as 367 with 2 decimals)
    uint256 public usdToAedRate = 367;
    uint256 public constant RATE_DECIMALS = 2;
    
    // Fees (basis points)
    uint256 public depositFee = 10;  // 0.1%
    uint256 public withdrawFee = 10; // 0.1%
    uint256 public swapFee = 30;     // 0.3%
    
    // ============ Events ============
    
    event Deposited(
        bytes32 indexed depositId,
        address indexed depositor,
        uint256 usdcAmount,
        uint256 aedAmount
    );
    
    event Withdrawn(
        bytes32 indexed depositId,
        address indexed depositor,
        uint256 amount
    );
    
    event Swapped(
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        bool usdcToAed
    );
    
    event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 aedAmount);
    event RateUpdated(uint256 newRate);
    
    // ============ Errors ============
    
    error OnlyOwner();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error InvalidAmount();
    error TransferFailed();
    error AlreadyWithdrawn();
    error DepositNotFound();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _usdc, address _aedStable, address _oracle) {
        owner = msg.sender;
        usdc = _usdc;
        aedStable = _aedStable;
        oracle = _oracle;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Deposit USDC and receive AED-stable
     * @param _usdcAmount Amount of USDC to deposit
     * @return depositId Unique deposit identifier
     * @return aedAmount AED-stable tokens received
     */
    function depositUSDC(uint256 _usdcAmount) external returns (bytes32 depositId, uint256 aedAmount) {
        if (_usdcAmount == 0) revert InvalidAmount();
        
        // Transfer USDC from user
        bool success = IERC20(usdc).transferFrom(msg.sender, address(this), _usdcAmount);
        if (!success) revert TransferFailed();
        
        // Calculate fee and net amount
        uint256 fee = (_usdcAmount * depositFee) / 10000;
        uint256 netAmount = _usdcAmount - fee;
        
        // Convert to AED: 1 USDC = 3.67 AED
        aedAmount = (netAmount * usdToAedRate) / (10 ** RATE_DECIMALS);
        
        depositId = keccak256(abi.encodePacked(
            msg.sender,
            _usdcAmount,
            block.timestamp,
            depositCount++
        ));
        
        deposits[depositId] = Deposit({
            depositor: msg.sender,
            usdcAmount: _usdcAmount,
            aedAmount: aedAmount,
            timestamp: block.timestamp,
            withdrawn: false
        });
        
        userBalancesAED[msg.sender] += aedAmount;
        totalLiquidityUSDC += netAmount;
        
        emit Deposited(depositId, msg.sender, _usdcAmount, aedAmount);
    }
    
    /**
     * @notice Withdraw USDC by burning AED-stable
     * @param _aedAmount Amount of AED to convert back
     * @return usdcAmount USDC tokens received
     */
    function withdrawUSDC(uint256 _aedAmount) external returns (uint256 usdcAmount) {
        if (_aedAmount == 0) revert InvalidAmount();
        if (userBalancesAED[msg.sender] < _aedAmount) revert InsufficientBalance();
        
        // Convert AED to USDC: 1 AED = 1/3.67 USDC
        usdcAmount = (_aedAmount * (10 ** RATE_DECIMALS)) / usdToAedRate;
        
        // Apply withdrawal fee
        uint256 fee = (usdcAmount * withdrawFee) / 10000;
        usdcAmount -= fee;
        
        if (totalLiquidityUSDC < usdcAmount) revert InsufficientLiquidity();
        
        userBalancesAED[msg.sender] -= _aedAmount;
        totalLiquidityUSDC -= usdcAmount;
        
        // Transfer USDC to user
        bool success = IERC20(usdc).transfer(msg.sender, usdcAmount);
        if (!success) revert TransferFailed();
        
        emit Withdrawn(bytes32(0), msg.sender, usdcAmount);
    }
    
    /**
     * @notice Swap USDC ↔ AED at current rate
     * @param _amountIn Amount to swap
     * @param _usdcToAed Direction: true for USDC→AED, false for AED→USDC
     * @return amountOut Output amount after fees
     */
    function swap(uint256 _amountIn, bool _usdcToAed) external returns (uint256 amountOut) {
        if (_amountIn == 0) revert InvalidAmount();
        
        // Apply swap fee
        uint256 fee = (_amountIn * swapFee) / 10000;
        uint256 netAmount = _amountIn - fee;
        
        if (_usdcToAed) {
            // USDC → AED
            if (userBalancesUSDC[msg.sender] < _amountIn) {
                // Try to transfer from wallet
                bool success = IERC20(usdc).transferFrom(msg.sender, address(this), _amountIn);
                if (!success) revert TransferFailed();
            } else {
                userBalancesUSDC[msg.sender] -= _amountIn;
            }
            
            amountOut = (netAmount * usdToAedRate) / (10 ** RATE_DECIMALS);
            userBalancesAED[msg.sender] += amountOut;
            totalLiquidityUSDC += netAmount;
            
        } else {
            // AED → USDC
            if (userBalancesAED[msg.sender] < _amountIn) revert InsufficientBalance();
            
            amountOut = (netAmount * (10 ** RATE_DECIMALS)) / usdToAedRate;
            
            if (totalLiquidityUSDC < amountOut) revert InsufficientLiquidity();
            
            userBalancesAED[msg.sender] -= _amountIn;
            userBalancesUSDC[msg.sender] += amountOut;
            totalLiquidityUSDC -= amountOut;
        }
        
        emit Swapped(msg.sender, _amountIn, amountOut, _usdcToAed);
    }
    
    /**
     * @notice Fund broker account (1-click DFM funding)
     * @param _usdcAmount USDC amount to convert
     * @param _brokerAddress Mock broker address
     */
    function fundBroker(uint256 _usdcAmount, address _brokerAddress) external returns (uint256 aedAmount) {
        (bytes32 depositId, uint256 aed) = this.depositUSDC(_usdcAmount);
        aedAmount = aed;
        
        // Transfer AED balance to broker
        userBalancesAED[msg.sender] -= aedAmount;
        userBalancesAED[_brokerAddress] += aedAmount;
    }
    
    // ============ Liquidity Provider Functions ============
    
    /**
     * @notice Add liquidity to the gateway
     */
    function addLiquidity(uint256 _usdcAmount) external {
        bool success = IERC20(usdc).transferFrom(msg.sender, address(this), _usdcAmount);
        if (!success) revert TransferFailed();
        
        uint256 aedEquivalent = (_usdcAmount * usdToAedRate) / (10 ** RATE_DECIMALS);
        
        totalLiquidityUSDC += _usdcAmount;
        totalLiquidityAED += aedEquivalent;
        
        emit LiquidityAdded(msg.sender, _usdcAmount, aedEquivalent);
    }
    
    // ============ Admin Functions ============
    
    function updateRate(uint256 _newRate) external onlyOwner {
        usdToAedRate = _newRate;
        emit RateUpdated(_newRate);
    }
    
    function setFees(uint256 _depositFee, uint256 _withdrawFee, uint256 _swapFee) external onlyOwner {
        depositFee = _depositFee;
        withdrawFee = _withdrawFee;
        swapFee = _swapFee;
    }
    
    function setTokens(address _usdc, address _aedStable) external onlyOwner {
        usdc = _usdc;
        aedStable = _aedStable;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
    
    // Emergency withdrawal
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            (bool success, ) = owner.call{value: _amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(_token).transfer(owner, _amount);
        }
    }
    
    // ============ View Functions ============
    
    function getDeposit(bytes32 _depositId) external view returns (Deposit memory) {
        return deposits[_depositId];
    }
    
    function getUserBalances(address _user) external view returns (uint256 usdcBal, uint256 aedBal) {
        return (userBalancesUSDC[_user], userBalancesAED[_user]);
    }
    
    function getExchangeRate() external view returns (uint256) {
        return usdToAedRate;
    }
    
    function estimateSwap(uint256 _amountIn, bool _usdcToAed) external view returns (uint256 amountOut) {
        uint256 fee = (_amountIn * swapFee) / 10000;
        uint256 netAmount = _amountIn - fee;
        
        if (_usdcToAed) {
            amountOut = (netAmount * usdToAedRate) / (10 ** RATE_DECIMALS);
        } else {
            amountOut = (netAmount * (10 ** RATE_DECIMALS)) / usdToAedRate;
        }
    }
    
    function getTotalLiquidity() external view returns (uint256 usdcLiq, uint256 aedLiq) {
        return (totalLiquidityUSDC, totalLiquidityAED);
    }
    
    // ============ Receive ============
    
    receive() external payable {}
}
