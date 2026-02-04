// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./MockERC20.sol";

/**
 * @title LIFIRouter
 * @notice Wrapper for LI.FI cross-chain zap execution
 * @dev Routes swaps through LI.FI diamond contract for optimal cross-chain paths
 * 
 * Supported Routes:
 * - Polygon Mumbai → Arc Testnet (via USDC)
 * - Arc Testnet → Polygon Mumbai
 */
contract LIFIRouter {
    
    // ============ Structs ============
    
    struct ZapRequest {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 destinationChainId;
        address recipient;
        bytes lifiData; // Encoded LI.FI route data
    }
    
    struct Route {
        uint256 srcChainId;
        uint256 dstChainId;
        address bridge;
        bool active;
        uint256 fee; // Basis points (100 = 1%)
    }
    
    // ============ State ============
    
    address public owner;
    address public lifiDiamond; // LI.FI Diamond contract address
    address public yellowAdapter; // Yellow Adapter for gasless txs
    
    mapping(bytes32 => Route) public routes;
    mapping(address => bool) public supportedTokens;
    
    // Chain IDs
    uint256 public constant ETHEREUM_SEPOLIA = 11155111;
    uint256 public constant ARC_TESTNET = 5042002;
    
    // Zap tracking
    uint256 public zapCount;
    mapping(bytes32 => ZapRequest) public pendingZaps;
    
    // ============ Events ============
    
    event ZapInitiated(
        bytes32 indexed zapId,
        address indexed sender,
        address tokenIn,
        uint256 amountIn,
        uint256 destinationChainId
    );
    
    event ZapCompleted(
        bytes32 indexed zapId,
        address indexed recipient,
        uint256 amountOut
    );
    
    event RouteUpdated(
        uint256 srcChainId,
        uint256 dstChainId,
        address bridge,
        bool active
    );
    
    // ============ Errors ============
    
    error OnlyOwner();
    error OnlyYellowAdapter();
    error UnsupportedToken();
    error UnsupportedRoute();
    error InsufficientAmount();
    error TransferFailed();
    error ZapFailed();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyYellowAdapter() {
        if (msg.sender != yellowAdapter) revert OnlyYellowAdapter();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _lifiDiamond, address _yellowAdapter) {
        owner = msg.sender;
        lifiDiamond = _lifiDiamond;
        yellowAdapter = _yellowAdapter;
        
        // Initialize default routes
        _addRoute(ETHEREUM_SEPOLIA, ARC_TESTNET, address(0), 30); // 0.3% fee
        _addRoute(ARC_TESTNET, ETHEREUM_SEPOLIA, address(0), 30);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Execute a cross-chain zap via LI.FI
     * @param _request Zap request details
     * @return zapId Unique identifier for tracking
     */
    function executeZap(ZapRequest memory _request) public payable returns (bytes32 zapId) {
        if (!supportedTokens[_request.tokenIn]) revert UnsupportedToken();
        if (_request.amountIn == 0) revert InsufficientAmount();
        
        bytes32 routeKey = keccak256(abi.encodePacked(
            block.chainid,
            _request.destinationChainId
        ));
        
        if (!routes[routeKey].active) revert UnsupportedRoute();
        
        zapId = keccak256(abi.encodePacked(
            msg.sender,
            _request.tokenIn,
            _request.amountIn,
            block.timestamp,
            zapCount++
        ));
        
        // Transfer tokens from user
        if (_request.tokenIn != address(0)) {
            bool success = IERC20(_request.tokenIn).transferFrom(
                msg.sender,
                address(this),
                _request.amountIn
            );
            if (!success) revert TransferFailed();
            
            // Approve LI.FI Diamond
            IERC20(_request.tokenIn).approve(lifiDiamond, _request.amountIn);
        }

        // SETTLEMENT FOR DEMO: Mint the output token to the recipient
        // This simulates the bridge releasing tokens on the destination chain
        if (_request.tokenOut != address(0)) {
             // We use the open 'mint' function of MockERC20 for the hackathon
             // In production, this would be a message to the Bridge/Relayer
             try MockERC20(_request.tokenOut).mint(_request.recipient, _request.minAmountOut) {
                 // Success
             } catch {
                 // Ignore failure if not a MockERC20 (fallback)
             }
        }
        
        // In production, this would call the LI.FI Diamond contract
        // For hackathon demo, we simulate the cross-chain execution
        pendingZaps[zapId] = _request;
        
        emit ZapInitiated(
            zapId,
            msg.sender,
            _request.tokenIn,
            _request.amountIn,
            _request.destinationChainId
        );
        
        // For demo: execute immediate mock completion
        _simulateZapCompletion(zapId, _request);
    }

    /**
     * @notice Execute a gasless cross-chain zap via Yellow Adapter
     * @dev Only callable by YellowAdapter. Pulls tokens from _user (must have approval)
     * @param _request Zap request details
     * @param _user The original user who signed the meta-tx
     */
    function executeZapGasless(
        ZapRequest memory _request,
        address _user
    ) public payable onlyYellowAdapter returns (bytes32 zapId) {
        if (!supportedTokens[_request.tokenIn]) revert UnsupportedToken();
        if (_request.amountIn == 0) revert InsufficientAmount();
        
        bytes32 routeKey = keccak256(abi.encodePacked(
            block.chainid,
            _request.destinationChainId
        ));
        
        if (!routes[routeKey].active) revert UnsupportedRoute();
        
        zapId = keccak256(abi.encodePacked(
            _user, // Use _user instead of msg.sender
            _request.tokenIn,
            _request.amountIn,
            block.timestamp,
            zapCount++
        ));
        
        // Transfer tokens from USER (not adapter)
        // User must have approved LIFIRouter beforehand
        if (_request.tokenIn != address(0)) {
            bool success = IERC20(_request.tokenIn).transferFrom(
                _user,
                address(this),
                _request.amountIn
            );
            if (!success) revert TransferFailed();
            
            // Approve LI.FI Diamond
            IERC20(_request.tokenIn).approve(lifiDiamond, _request.amountIn);
        }

        // SETTLEMENT FOR DEMO
        if (_request.tokenOut != address(0)) {
             try MockERC20(_request.tokenOut).mint(_request.recipient, _request.minAmountOut) {} catch {}
        }
        
        pendingZaps[zapId] = _request;
        
        emit ZapInitiated(
            zapId,
            _user,
            _request.tokenIn,
            _request.amountIn,
            _request.destinationChainId
        );
        
        _simulateZapCompletion(zapId, _request);
    }
    
    /**
     * @notice Quick zap from Mumbai to Arc (convenience function)
     * @param _tokenIn Source token on Mumbai
     * @param _tokenOut Destination token address (AED)
     * @param _amount Amount to zap
     * @param _recipient Recipient on Arc
     */
    function zapToArc(
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        address _recipient
    ) external payable returns (bytes32) {
        ZapRequest memory request = ZapRequest({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut, 
            amountIn: _amount,
            minAmountOut: (_amount * 97) / 100, // 3% slippage
            destinationChainId: ARC_TESTNET,
            recipient: _recipient,
            lifiData: ""
        });
        
        return executeZap(request);
    }
    
    /**
     * @notice Quick zap from Arc to Sepolia (convenience function)
     */
    function zapToSepolia(
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        address _recipient
    ) external payable returns (bytes32) {
        ZapRequest memory request = ZapRequest({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountIn: _amount,
            minAmountOut: (_amount * 97) / 100,
            destinationChainId: ETHEREUM_SEPOLIA,
            recipient: _recipient,
            lifiData: ""
        });
        
        return executeZap(request);
    }
    
    // ============ Admin Functions ============
    
    function addSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = true;
    }
    
    function removeSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = false;
    }
    
    function updateRoute(
        uint256 _srcChainId,
        uint256 _dstChainId,
        address _bridge,
        uint256 _fee,
        bool _active
    ) external onlyOwner {
        bytes32 routeKey = keccak256(abi.encodePacked(_srcChainId, _dstChainId));
        routes[routeKey] = Route({
            srcChainId: _srcChainId,
            dstChainId: _dstChainId,
            bridge: _bridge,
            active: _active,
            fee: _fee
        });
        
        emit RouteUpdated(_srcChainId, _dstChainId, _bridge, _active);
    }
    
    function setLifiDiamond(address _diamond) external onlyOwner {
        lifiDiamond = _diamond;
    }

    function setYellowAdapter(address _adapter) external onlyOwner {
        yellowAdapter = _adapter;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
    
    // ============ View Functions ============
    
    function getRoute(uint256 _srcChainId, uint256 _dstChainId) external view returns (Route memory) {
        bytes32 routeKey = keccak256(abi.encodePacked(_srcChainId, _dstChainId));
        return routes[routeKey];
    }
    
    function isRouteActive(uint256 _srcChainId, uint256 _dstChainId) external view returns (bool) {
        bytes32 routeKey = keccak256(abi.encodePacked(_srcChainId, _dstChainId));
        return routes[routeKey].active;
    }
    
    function estimateFee(uint256 _amount, uint256 _srcChainId, uint256 _dstChainId) 
        external view returns (uint256) 
    {
        bytes32 routeKey = keccak256(abi.encodePacked(_srcChainId, _dstChainId));
        Route storage route = routes[routeKey];
        return (_amount * route.fee) / 10000;
    }
    
    // ============ Internal Functions ============
    
    function _addRoute(uint256 _srcChainId, uint256 _dstChainId, address _bridge, uint256 _fee) internal {
        bytes32 routeKey = keccak256(abi.encodePacked(_srcChainId, _dstChainId));
        routes[routeKey] = Route({
            srcChainId: _srcChainId,
            dstChainId: _dstChainId,
            bridge: _bridge,
            active: true,
            fee: _fee
        });
    }
    
    function _simulateZapCompletion(bytes32 _zapId, ZapRequest memory _request) internal {
        // In demo mode, we emit completion immediately
        // Production would wait for cross-chain confirmation
        emit ZapCompleted(_zapId, _request.recipient, _request.minAmountOut);
    }
    
    // ============ Receive ============
    
    receive() external payable {}
}
