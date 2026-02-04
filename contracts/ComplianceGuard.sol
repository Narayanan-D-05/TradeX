// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ComplianceGuard
 * @notice KYC/FEMA compliance gates for TradeX transactions
 * @dev Mock implementation for hackathon - production would integrate real KYC providers
 * 
 * Features:
 * - User whitelist management
 * - FEMA compliance attestation NFTs
 * - Transaction limits per user tier
 */
contract ComplianceGuard {
    
    // ============ Enums ============
    
    enum KYCLevel {
        NONE,       // Not verified
        BASIC,      // Phone/Email verified
        STANDARD,   // ID verified
        ENHANCED    // Full KYC + Source of funds
    }
    
    // ============ Structs ============
    
    struct UserProfile {
        address user;
        KYCLevel kycLevel;
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailyUsed;
        uint256 monthlyUsed;
        uint256 lastDailyReset;
        uint256 lastMonthlyReset;
        bool blacklisted;
        string region; // "IN" for India, "AE" for UAE
    }
    
    struct ComplianceAttestation {
        uint256 tokenId;
        address user;
        string attestationType; // "FEMA_LRS", "RBI_CBDC", "ADGM_SANDBOX"
        uint256 validUntil;
        bytes32 documentHash;
    }
    
    // ============ State ============
    
    address public owner;
    address public complianceAdmin;
    
    mapping(address => UserProfile) public userProfiles;
    mapping(uint256 => ComplianceAttestation) public attestations;
    mapping(address => uint256[]) public userAttestations;
    
    uint256 public attestationCount;
    
    // Default limits by KYC level (in USDC, 6 decimals)
    mapping(KYCLevel => uint256) public dailyLimits;
    mapping(KYCLevel => uint256) public monthlyLimits;
    
    // Blacklisted addresses (sanctions)
    mapping(address => bool) public blacklist;
    
    // ============ Events ============
    
    event UserVerified(address indexed user, KYCLevel level);
    event AttestationMinted(uint256 indexed tokenId, address indexed user, string attestationType);
    event UserBlacklisted(address indexed user, bool status);
    event TransactionChecked(address indexed user, uint256 amount, bool approved);
    event LimitsUpdated(KYCLevel level, uint256 dailyLimit, uint256 monthlyLimit);
    
    // ============ Errors ============
    
    error OnlyOwner();
    error OnlyAdmin();
    error UserBlacklistedError();
    error KYCRequired();
    error DailyLimitExceeded();
    error MonthlyLimitExceeded();
    error InvalidAttestation();
    error AttestationExpired();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyAdmin() {
        if (msg.sender != owner && msg.sender != complianceAdmin) revert OnlyAdmin();
        _;
    }
    
    modifier notBlacklisted(address _user) {
        if (blacklist[_user] || userProfiles[_user].blacklisted) revert UserBlacklistedError();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        complianceAdmin = msg.sender;
        
        // Set default limits (USDC with 6 decimals)
        dailyLimits[KYCLevel.NONE] = 0;
        dailyLimits[KYCLevel.BASIC] = 1000 * 1e6;      // $1,000
        dailyLimits[KYCLevel.STANDARD] = 25000 * 1e6;  // $25,000
        dailyLimits[KYCLevel.ENHANCED] = 250000 * 1e6; // $250,000
        
        monthlyLimits[KYCLevel.NONE] = 0;
        monthlyLimits[KYCLevel.BASIC] = 10000 * 1e6;     // $10,000
        monthlyLimits[KYCLevel.STANDARD] = 250000 * 1e6; // $250,000
        monthlyLimits[KYCLevel.ENHANCED] = 2500000 * 1e6; // $2,500,000
    }
    
    // ============ User Verification ============
    
    /**
     * @notice Verify a user's KYC level (admin only)
     * @param _user User address
     * @param _level KYC verification level
     * @param _region User's region code
     */
    function verifyUser(
        address _user,
        KYCLevel _level,
        string calldata _region
    ) external onlyAdmin {
        userProfiles[_user] = UserProfile({
            user: _user,
            kycLevel: _level,
            dailyLimit: dailyLimits[_level],
            monthlyLimit: monthlyLimits[_level],
            dailyUsed: 0,
            monthlyUsed: 0,
            lastDailyReset: block.timestamp,
            lastMonthlyReset: block.timestamp,
            blacklisted: false,
            region: _region
        });
        
        emit UserVerified(_user, _level);
    }
    
    /**
     * @notice Self-verify for demo purposes (BASIC level only)
     */
    function selfVerifyBasic() external {
        if (userProfiles[msg.sender].kycLevel != KYCLevel.NONE) {
            return; // Already verified
        }
        
        userProfiles[msg.sender] = UserProfile({
            user: msg.sender,
            kycLevel: KYCLevel.BASIC,
            dailyLimit: dailyLimits[KYCLevel.BASIC],
            monthlyLimit: monthlyLimits[KYCLevel.BASIC],
            dailyUsed: 0,
            monthlyUsed: 0,
            lastDailyReset: block.timestamp,
            lastMonthlyReset: block.timestamp,
            blacklisted: false,
            region: "IN"
        });
        
        emit UserVerified(msg.sender, KYCLevel.BASIC);
    }
    
    // ============ Compliance Checks ============
    
    /**
     * @notice Check if a transaction is compliant
     * @param _user User address
     * @param _amount Transaction amount
     * @return approved Whether transaction is approved
     */
    function checkTransaction(
        address _user,
        uint256 _amount
    ) external notBlacklisted(_user) returns (bool approved) {
        UserProfile storage profile = userProfiles[_user];
        
        if (profile.kycLevel == KYCLevel.NONE) revert KYCRequired();
        
        // Reset limits if needed
        _resetLimitsIfNeeded(profile);
        
        // Check daily limit
        if (profile.dailyUsed + _amount > profile.dailyLimit) {
            emit TransactionChecked(_user, _amount, false);
            revert DailyLimitExceeded();
        }
        
        // Check monthly limit
        if (profile.monthlyUsed + _amount > profile.monthlyLimit) {
            emit TransactionChecked(_user, _amount, false);
            revert MonthlyLimitExceeded();
        }
        
        // Update usage
        profile.dailyUsed += _amount;
        profile.monthlyUsed += _amount;
        
        emit TransactionChecked(_user, _amount, true);
        return true;
    }
    
    /**
     * @notice View-only compliance check (doesn't update state)
     */
    function canTransact(address _user, uint256 _amount) external view returns (bool, string memory) {
        if (blacklist[_user] || userProfiles[_user].blacklisted) {
            return (false, "User blacklisted");
        }
        
        UserProfile storage profile = userProfiles[_user];
        
        if (profile.kycLevel == KYCLevel.NONE) {
            return (false, "KYC required");
        }
        
        uint256 effectiveDailyUsed = profile.dailyUsed;
        uint256 effectiveMonthlyUsed = profile.monthlyUsed;
        
        // Simulate reset
        if (block.timestamp >= profile.lastDailyReset + 1 days) {
            effectiveDailyUsed = 0;
        }
        if (block.timestamp >= profile.lastMonthlyReset + 30 days) {
            effectiveMonthlyUsed = 0;
        }
        
        if (effectiveDailyUsed + _amount > profile.dailyLimit) {
            return (false, "Daily limit exceeded");
        }
        
        if (effectiveMonthlyUsed + _amount > profile.monthlyLimit) {
            return (false, "Monthly limit exceeded");
        }
        
        return (true, "Approved");
    }
    
    // ============ Attestation NFTs ============
    
    /**
     * @notice Mint a FEMA/RBI compliance attestation
     * @param _user User address
     * @param _attestationType Type of attestation
     * @param _validDays Validity period in days
     * @param _documentHash Hash of compliance document
     */
    function mintAttestation(
        address _user,
        string calldata _attestationType,
        uint256 _validDays,
        bytes32 _documentHash
    ) external onlyAdmin returns (uint256 tokenId) {
        tokenId = ++attestationCount;
        
        attestations[tokenId] = ComplianceAttestation({
            tokenId: tokenId,
            user: _user,
            attestationType: _attestationType,
            validUntil: block.timestamp + (_validDays * 1 days),
            documentHash: _documentHash
        });
        
        userAttestations[_user].push(tokenId);
        
        emit AttestationMinted(tokenId, _user, _attestationType);
    }
    
    /**
     * @notice Verify if user has valid attestation of given type
     */
    function hasValidAttestation(
        address _user,
        string calldata _attestationType
    ) external view returns (bool) {
        uint256[] storage userTokens = userAttestations[_user];
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            ComplianceAttestation storage att = attestations[userTokens[i]];
            if (
                keccak256(bytes(att.attestationType)) == keccak256(bytes(_attestationType)) &&
                att.validUntil > block.timestamp
            ) {
                return true;
            }
        }
        
        return false;
    }
    
    // ============ Admin Functions ============
    
    function setBlacklist(address _user, bool _status) external onlyAdmin {
        blacklist[_user] = _status;
        userProfiles[_user].blacklisted = _status;
        emit UserBlacklisted(_user, _status);
    }
    
    function setLimits(
        KYCLevel _level,
        uint256 _dailyLimit,
        uint256 _monthlyLimit
    ) external onlyOwner {
        dailyLimits[_level] = _dailyLimit;
        monthlyLimits[_level] = _monthlyLimit;
        emit LimitsUpdated(_level, _dailyLimit, _monthlyLimit);
    }
    
    function setComplianceAdmin(address _admin) external onlyOwner {
        complianceAdmin = _admin;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
    
    // ============ View Functions ============
    
    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return userProfiles[_user];
    }
    
    function getKYCLevel(address _user) external view returns (KYCLevel) {
        return userProfiles[_user].kycLevel;
    }
    
    function getRemainingLimits(address _user) external view returns (uint256 dailyRemaining, uint256 monthlyRemaining) {
        UserProfile storage profile = userProfiles[_user];
        
        dailyRemaining = profile.dailyLimit > profile.dailyUsed 
            ? profile.dailyLimit - profile.dailyUsed 
            : 0;
            
        monthlyRemaining = profile.monthlyLimit > profile.monthlyUsed 
            ? profile.monthlyLimit - profile.monthlyUsed 
            : 0;
    }
    
    function getUserAttestations(address _user) external view returns (uint256[] memory) {
        return userAttestations[_user];
    }
    
    function getAttestation(uint256 _tokenId) external view returns (ComplianceAttestation memory) {
        return attestations[_tokenId];
    }
    
    // ============ Internal Functions ============
    
    function _resetLimitsIfNeeded(UserProfile storage _profile) internal {
        // Reset daily limit
        if (block.timestamp >= _profile.lastDailyReset + 1 days) {
            _profile.dailyUsed = 0;
            _profile.lastDailyReset = block.timestamp;
        }
        
        // Reset monthly limit
        if (block.timestamp >= _profile.lastMonthlyReset + 30 days) {
            _profile.monthlyUsed = 0;
            _profile.lastMonthlyReset = block.timestamp;
        }
    }
}
