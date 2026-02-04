// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TradeXOracle
 * @notice Mock Chainlink-compatible oracle for INR/USD and AED/USD price feeds
 * @dev For hackathon demo - production would use Chainlink API Consumer
 * 
 * Default Rates (Feb 2026):
 * - INR/USD: 0.01198 (₹83.5 = $1)
 * - AED/USD: 0.2725 (AED 3.67 = $1)
 * - INR/AED: 0.044 (₹22.75 = 1 AED)
 */
contract TradeXOracle {
    
    // ============ Structs ============
    
    struct PriceFeed {
        int256 price;        // Price with 8 decimals
        uint256 updatedAt;   // Last update timestamp
        uint80 roundId;      // Round identifier
        string description;  // Feed description
    }
    
    // ============ State ============
    
    address public owner;
    
    // Price feeds (matching Chainlink AggregatorV3Interface format)
    mapping(bytes32 => PriceFeed) public priceFeeds;
    
    bytes32 public constant INR_USD = keccak256("INR/USD");
    bytes32 public constant AED_USD = keccak256("AED/USD");
    bytes32 public constant INR_AED = keccak256("INR/AED");
    bytes32 public constant USD_INR = keccak256("USD/INR");
    bytes32 public constant USD_AED = keccak256("USD/AED");
    
    uint8 public constant DECIMALS = 8;
    
    // ============ Events ============
    
    event PriceUpdated(bytes32 indexed feedId, int256 price, uint256 timestamp);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);
    
    // ============ Errors ============
    
    error OnlyOwner();
    error InvalidPrice();
    error FeedNotFound();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        
        // Initialize default prices (8 decimals)
        // INR/USD = 0.01198 ($1 = ₹83.5)
        _setPrice(INR_USD, 1198000, "INR / USD");
        
        // AED/USD = 0.2725 ($1 = AED 3.67)
        _setPrice(AED_USD, 27250000, "AED / USD");
        
        // INR/AED = 0.044 (₹22.75 = 1 AED)
        _setPrice(INR_AED, 4400000, "INR / AED");
        
        // USD/INR = 83.5
        _setPrice(USD_INR, 8350000000, "USD / INR");
        
        // USD/AED = 3.67
        _setPrice(USD_AED, 367000000, "USD / AED");
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Update a price feed (admin only)
     * @param _feedId Feed identifier (e.g., INR_USD)
     * @param _price New price with 8 decimals
     */
    function updatePrice(bytes32 _feedId, int256 _price) external onlyOwner {
        if (_price <= 0) revert InvalidPrice();
        
        PriceFeed storage feed = priceFeeds[_feedId];
        feed.price = _price;
        feed.updatedAt = block.timestamp;
        feed.roundId++;
        
        emit PriceUpdated(_feedId, _price, block.timestamp);
    }
    
    /**
     * @notice Batch update multiple prices
     */
    function batchUpdatePrices(
        bytes32[] calldata _feedIds,
        int256[] calldata _prices
    ) external onlyOwner {
        for (uint256 i = 0; i < _feedIds.length; i++) {
            if (_prices[i] <= 0) revert InvalidPrice();
            
            PriceFeed storage feed = priceFeeds[_feedIds[i]];
            feed.price = _prices[i];
            feed.updatedAt = block.timestamp;
            feed.roundId++;
            
            emit PriceUpdated(_feedIds[i], _prices[i], block.timestamp);
        }
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        emit OwnerUpdated(owner, _newOwner);
        owner = _newOwner;
    }
    
    // ============ View Functions (Chainlink Compatible) ============
    
    /**
     * @notice Get latest price data (Chainlink AggregatorV3Interface compatible)
     * @param _feedId Feed identifier
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundData(bytes32 _feedId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        PriceFeed storage feed = priceFeeds[_feedId];
        if (feed.updatedAt == 0) revert FeedNotFound();
        
        return (
            feed.roundId,
            feed.price,
            feed.updatedAt,
            feed.updatedAt,
            feed.roundId
        );
    }
    
    /**
     * @notice Get latest price only
     */
    function getLatestPrice(bytes32 _feedId) external view returns (int256) {
        PriceFeed storage feed = priceFeeds[_feedId];
        if (feed.updatedAt == 0) revert FeedNotFound();
        return feed.price;
    }
    
    /**
     * @notice Get INR to AED conversion rate
     * @param _inrAmount Amount in INR (18 decimals)
     * @return aedAmount Equivalent AED amount (18 decimals)
     */
    function convertINRtoAED(uint256 _inrAmount) external view returns (uint256) {
        // INR/AED rate with 8 decimals
        int256 rate = priceFeeds[INR_AED].price;
        return (_inrAmount * uint256(rate)) / 1e8;
    }
    
    /**
     * @notice Get AED to INR conversion rate
     * @param _aedAmount Amount in AED (18 decimals)
     * @return inrAmount Equivalent INR amount (18 decimals)
     */
    function convertAEDtoINR(uint256 _aedAmount) external view returns (uint256) {
        // INR/AED = 0.044, so AED/INR = 1/0.044 = 22.727
        int256 inrAedRate = priceFeeds[INR_AED].price;
        return (_aedAmount * 1e8) / uint256(inrAedRate);
    }
    
    /**
     * @notice Get decimals for price feeds
     */
    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Get feed description
     */
    function description(bytes32 _feedId) external view returns (string memory) {
        return priceFeeds[_feedId].description;
    }
    
    // ============ Internal Functions ============
    
    function _setPrice(bytes32 _feedId, int256 _price, string memory _description) internal {
        priceFeeds[_feedId] = PriceFeed({
            price: _price,
            updatedAt: block.timestamp,
            roundId: 1,
            description: _description
        });
    }
}
