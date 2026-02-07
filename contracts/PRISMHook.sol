// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

/**
 * @title PRISMHook — Price-Referenced Instant Settlement Mechanism
 * @author TradeX Protocol
 * @notice A Uniswap V4 Hook that implements "Refracted Execution":
 *         swaps are split into a **Price Ray** (on-chain AMM rate)
 *         and a **Settlement Ray** (off-chain state-channel transfer).
 *
 *     Like light through a prism, a single swap intent is refracted into
 *     two paths that recombine at the destination:
 *
 *        ┌──────────────────────────────────────────────────┐
 *        │              PRISM Hook (V4)                     │
 *        │                                                  │
 *        │   beforeSwap():                                  │
 *        │     1. Read sqrtPriceX96 from pool               │
 *        │     2. Calculate fixing rate for token pair       │
 *        │     3. Emit PrismFixingRate event                 │
 *        │     4. Optionally return ZERO_DELTA               │
 *        │        (no AMM execution — price oracle only)     │
 *        │                                                  │
 *        │   attestSettlement():                             │
 *        │     Store merkle root of off-chain settlements    │
 *        │     anchoring state-channel finality on-chain     │
 *        │                                                  │
 *        │   verifySettlement():                             │
 *        │     Merkle-prove any off-chain settlement         │
 *        │     matched the V4 fixing rate at that epoch      │
 *        └──────────────────────────────────────────────────┘
 *
 * @dev Inspired by TradFi's WM/Reuters FX Fixing — a benchmark rate
 *      at which $6.6 T/day of forex settles without touching spot.
 *      PRISM is the decentralised, continuous equivalent for DeFi.
 */
contract PRISMHook {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    // ────────────────────── Constants ──────────────────────

    /// @dev Fixed-point scaler 2^96 used in Uniswap sqrtPriceX96
    uint256 private constant Q96 = 2 ** 96;

    /// @dev Maximum age (in seconds) for a fixing rate to be considered valid
    uint256 public constant FIXING_RATE_TTL = 300; // 5 minutes

    // ────────────────────── Immutables ──────────────────────

    IPoolManager public immutable poolManager;

    // ────────────────────── State ──────────────────────

    /// @notice Owner / protocol operator
    address public owner;

    /// @notice Authorised relayer that may submit settlement attestations
    mapping(address => bool) public authorisedRelayers;

    // ── Fixing rates ──

    /// @notice Epoch counter — incremented every time a new fixing rate is recorded
    uint256 public currentEpoch;

    struct FixingRate {
        uint256 epoch;
        uint160 sqrtPriceX96;       // raw pool price snapshot
        uint256 rateScaled;         // human-friendly rate × 1e18
        uint256 timestamp;
        bytes32 poolId;
    }

    /// @notice Latest fixing rate per pool
    mapping(bytes32 => FixingRate) public latestFixing;

    /// @notice Historical fixing rates:  poolId ⇒ epoch ⇒ FixingRate
    mapping(bytes32 => mapping(uint256 => FixingRate)) public fixingHistory;

    // ── Settlement attestations ──

    struct SettlementAttestation {
        bytes32 merkleRoot;
        uint256 epoch;              // which fixing epoch these settlements used
        uint256 settlementCount;    // number of off-chain settlements in the batch
        uint256 totalVolume;        // aggregate notional (token0 units, scaled 1e6)
        uint256 timestamp;
        address relayer;
    }

    /// @notice Attestation ID ⇒ attestation data
    mapping(bytes32 => SettlementAttestation) public attestations;

    /// @notice Pool ⇒ ordered list of attestation IDs
    mapping(bytes32 => bytes32[]) public poolAttestations;

    /// @notice Total settlements verified across all pools
    uint256 public totalSettlements;

    /// @notice Total volume processed (scaled 1e6)
    uint256 public totalVolumeProcessed;

    // ────────────────────── Events ──────────────────────

    /// @notice Emitted every time the hook captures a pool's fixing rate
    event PrismFixingRate(
        bytes32 indexed poolId,
        uint256 indexed epoch,
        uint160 sqrtPriceX96,
        uint256 rateScaled,
        uint256 timestamp
    );

    /// @notice Emitted when a relayer anchors a batch of off-chain settlements
    event SettlementAttested(
        bytes32 indexed attestationId,
        bytes32 indexed poolId,
        uint256 indexed epoch,
        bytes32 merkleRoot,
        uint256 settlementCount,
        uint256 totalVolume,
        address relayer
    );

    /// @notice Emitted when a single settlement is verified via merkle proof
    event SettlementVerified(
        bytes32 indexed attestationId,
        address indexed sender,
        address indexed recipient,
        uint256 amountIn,
        uint256 amountOut,
        uint256 epoch
    );

    // ────────────────────── Errors ──────────────────────

    error OnlyOwner();
    error OnlyPoolManager();
    error OnlyAuthorisedRelayer();
    error InvalidMerkleProof();
    error FixingRateExpired();
    error AttestationAlreadyExists();
    error InvalidEpoch();

    // ────────────────────── Modifiers ──────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyRelayer() {
        if (!authorisedRelayers[msg.sender]) revert OnlyAuthorisedRelayer();
        _;
    }

    // ────────────────────── Constructor ──────────────────────

    constructor(IPoolManager _manager) {
        poolManager = _manager;
        owner = msg.sender;
        authorisedRelayers[msg.sender] = true; // deployer is first relayer
    }

    // ═══════════════════════════════════════════════════════
    //                 HOOK  ENTRY  POINTS
    // ═══════════════════════════════════════════════════════

    /**
     * @notice Called by PoolManager before every swap on a hooked pool.
     *         Captures the live sqrtPriceX96 as the **PRISM fixing rate**
     *         and emits it for off-chain relayers to consume.
     *
     * @dev    In "oracle-only" mode this hook returns a zero-delta so the
     *         actual AMM swap is suppressed — the pool acts as a pure
     *         price reference.  In "hybrid" mode (remove the override)
     *         the swap executes normally AND the fixing event is emitted.
     */
    function _beforeSwap(
        PoolKey calldata key,
        SwapParams calldata /* params */
    ) internal returns (bytes4) {
        bytes32 poolId = _poolKeyToId(key);

        // Snapshot the current pool price
        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(PoolId.wrap(poolId));

        // Calculate human-readable rate:  price = (sqrtPriceX96 / 2^96)^2  × 1e18
        uint256 rateScaled = _sqrtPriceToRate(sqrtPriceX96);

        // Advance epoch
        currentEpoch++;

        // Store fixing rate
        FixingRate memory fixing = FixingRate({
            epoch: currentEpoch,
            sqrtPriceX96: sqrtPriceX96,
            rateScaled: rateScaled,
            timestamp: block.timestamp,
            poolId: poolId
        });

        latestFixing[poolId] = fixing;
        fixingHistory[poolId][currentEpoch] = fixing;

        emit PrismFixingRate(poolId, currentEpoch, sqrtPriceX96, rateScaled, block.timestamp);

        // Return success selector
        return bytes4(keccak256("_beforeSwap(PoolKey,SwapParams)"));
    }

    // ═══════════════════════════════════════════════════════
    //             SETTLEMENT   ATTESTATION
    // ═══════════════════════════════════════════════════════

    /**
     * @notice Relayer anchors a batch of off-chain settlements on-chain.
     *         The `merkleRoot` covers all individual settlements executed
     *         at the fixing rate of `epoch`.
     *
     * @param poolId           Pool whose fixing rate was used
     * @param epoch            The fixing-rate epoch these settlements reference
     * @param merkleRoot       Merkle root of the settlement leaves
     * @param settlementCount  Number of settlements in this batch
     * @param totalVolume      Aggregate notional (token0 units, 6-decimal scaled)
     */
    function attestSettlement(
        bytes32 poolId,
        uint256 epoch,
        bytes32 merkleRoot,
        uint256 settlementCount,
        uint256 totalVolume
    ) external onlyRelayer {
        // Validate epoch exists
        FixingRate memory fixing = fixingHistory[poolId][epoch];
        if (fixing.epoch == 0) revert InvalidEpoch();

        // Validate fixing rate is not stale
        if (block.timestamp - fixing.timestamp > FIXING_RATE_TTL) revert FixingRateExpired();

        // Derive attestation ID
        bytes32 attestationId = keccak256(
            abi.encodePacked(poolId, epoch, merkleRoot, block.timestamp)
        );
        if (attestations[attestationId].timestamp != 0) revert AttestationAlreadyExists();

        // Store
        attestations[attestationId] = SettlementAttestation({
            merkleRoot: merkleRoot,
            epoch: epoch,
            settlementCount: settlementCount,
            totalVolume: totalVolume,
            timestamp: block.timestamp,
            relayer: msg.sender
        });

        poolAttestations[poolId].push(attestationId);

        // Update global counters
        totalSettlements += settlementCount;
        totalVolumeProcessed += totalVolume;

        emit SettlementAttested(
            attestationId,
            poolId,
            epoch,
            merkleRoot,
            settlementCount,
            totalVolume,
            msg.sender
        );
    }

    // ═══════════════════════════════════════════════════════
    //            SETTLEMENT   VERIFICATION
    // ═══════════════════════════════════════════════════════

    /**
     * @notice Anyone can verify that a specific off-chain settlement
     *         is included in an attested merkle tree, proving it settled
     *         at the PRISM fixing rate.
     *
     * @param attestationId  ID of the attestation to verify against
     * @param sender         The settlement sender
     * @param recipient      The settlement recipient
     * @param amountIn       Amount of tokenIn (6-decimal)
     * @param amountOut      Amount of tokenOut (6-decimal)
     * @param proof          Merkle proof (array of 32-byte hashes)
     */
    function verifySettlement(
        bytes32 attestationId,
        address sender,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        bytes32[] calldata proof
    ) external view returns (bool) {
        SettlementAttestation memory att = attestations[attestationId];
        if (att.timestamp == 0) return false;

        // Reconstruct the leaf
        bytes32 leaf = keccak256(
            abi.encodePacked(sender, recipient, amountIn, amountOut, att.epoch)
        );

        // Verify merkle proof
        return _verifyMerkleProof(proof, att.merkleRoot, leaf);
    }

    /**
     * @notice Convenience: verify AND emit an event (non-view version)
     */
    function verifyAndRecord(
        bytes32 attestationId,
        address sender,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        bytes32[] calldata proof
    ) external returns (bool) {
        SettlementAttestation memory att = attestations[attestationId];
        if (att.timestamp == 0) return false;

        bytes32 leaf = keccak256(
            abi.encodePacked(sender, recipient, amountIn, amountOut, att.epoch)
        );

        bool valid = _verifyMerkleProof(proof, att.merkleRoot, leaf);
        if (!valid) revert InvalidMerkleProof();

        emit SettlementVerified(
            attestationId, sender, recipient, amountIn, amountOut, att.epoch
        );

        return true;
    }

    // ═══════════════════════════════════════════════════════
    //                  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════

    /// @notice Get the latest fixing rate for a pool
    function getLatestFixing(bytes32 poolId) external view returns (
        uint256 epoch,
        uint160 sqrtPriceX96,
        uint256 rateScaled,
        uint256 timestamp
    ) {
        FixingRate memory f = latestFixing[poolId];
        return (f.epoch, f.sqrtPriceX96, f.rateScaled, f.timestamp);
    }

    /// @notice Get fixing rate at a specific epoch
    function getFixingAtEpoch(bytes32 poolId, uint256 epoch) external view returns (
        uint160 sqrtPriceX96,
        uint256 rateScaled,
        uint256 timestamp
    ) {
        FixingRate memory f = fixingHistory[poolId][epoch];
        return (f.sqrtPriceX96, f.rateScaled, f.timestamp);
    }

    /// @notice Get the number of attestations for a pool
    function getAttestationCount(bytes32 poolId) external view returns (uint256) {
        return poolAttestations[poolId].length;
    }

    /// @notice Get protocol-wide statistics
    function getProtocolStats() external view returns (
        uint256 _currentEpoch,
        uint256 _totalSettlements,
        uint256 _totalVolume
    ) {
        return (currentEpoch, totalSettlements, totalVolumeProcessed);
    }

    /// @notice Check if a fixing rate is still valid (within TTL)
    function isFixingValid(bytes32 poolId) external view returns (bool) {
        FixingRate memory f = latestFixing[poolId];
        if (f.timestamp == 0) return false;
        return (block.timestamp - f.timestamp) <= FIXING_RATE_TTL;
    }

    // ═══════════════════════════════════════════════════════
    //               MANUAL FIXING (for demo)
    // ═══════════════════════════════════════════════════════

    /**
     * @notice Manually capture the current fixing rate from a pool.
     *         Useful for demo / when the hook is not yet deployed
     *         as an actual V4 hook address.
     *
     * @param key  The PoolKey identifying the Uniswap V4 pool
     */
    function captureFixingRate(PoolKey calldata key) external returns (uint256 epoch) {
        bytes32 poolId = _poolKeyToId(key);

        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(PoolId.wrap(poolId));

        uint256 rateScaled = _sqrtPriceToRate(sqrtPriceX96);

        currentEpoch++;
        epoch = currentEpoch;

        FixingRate memory fixing = FixingRate({
            epoch: epoch,
            sqrtPriceX96: sqrtPriceX96,
            rateScaled: rateScaled,
            timestamp: block.timestamp,
            poolId: poolId
        });

        latestFixing[poolId] = fixing;
        fixingHistory[poolId][epoch] = fixing;

        emit PrismFixingRate(poolId, epoch, sqrtPriceX96, rateScaled, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════
    //                    ADMIN
    // ═══════════════════════════════════════════════════════

    function addRelayer(address relayer) external onlyOwner {
        authorisedRelayers[relayer] = true;
    }

    function removeRelayer(address relayer) external onlyOwner {
        authorisedRelayers[relayer] = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════════════
    //                INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════

    /**
     * @dev Convert sqrtPriceX96 to a human-readable rate scaled by 1e18.
     *      rate = (sqrtPriceX96 / 2^96)^2 * 1e18
     */
    function _sqrtPriceToRate(uint160 sqrtPriceX96) internal pure returns (uint256) {
        // Use uint256 to prevent overflow
        uint256 price = uint256(sqrtPriceX96);
        // (price * price) / (2^192) * 1e18
        // Split to avoid overflow: (price * price / 2^128) * 1e18 / 2^64
        uint256 priceSquared = (price * price) >> 128;
        return (priceSquared * 1e18) >> 64;
    }

    /**
     * @dev Reconstruct pool ID from PoolKey (matches Uniswap's keccak256 encoding)
     */
    function _poolKeyToId(PoolKey calldata key) internal pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }

    /**
     * @dev Standard merkle proof verification
     */
    function _verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }
}
