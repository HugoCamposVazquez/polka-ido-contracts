pragma solidity ^0.8.1;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./Whitelisted.sol";
import "./VestingLib.sol";
import "./SaleStructs.sol";

contract SaleContract is Whitelisted {
    using SafeMath for uint;
    using SafeMath for uint32;

    uint64 public startTime;
    uint64 public endTime;
    bool public whitelist;
    bool public isFeatured;
    uint public minDepositAmount;
    uint public maxDepositAmount;
    uint public salePrice;
    uint public totalDeposits;
    uint public totalDepositPerUser;
    uint public currentDeposit;
    Vesting.Token public token;
    string public metadataURI;

    // total how much user has claimed
    mapping (address => uint) private tokensClaimed;
    mapping (address => uint) private _userDeposits;

    Vesting.VestingConfig public vestingConfig;

    event Claim(string statemintReceiver, uint amount, Vesting.Token token);
    event BuyTokens(address user, uint amount);
    event SaleUpdated();

    constructor(
        uint64 _startTime,
        uint64 _endTime,
        uint _minDepositAmount,
        uint _maxDepositAmount,
        uint _totalDeposit,
        uint _salePrice,
        uint _totalDepositPerUser,
        Vesting.Token memory _token,
        SaleType.Options memory _options,
        Vesting.VestingConfig memory _vestingConfig,
        string memory _metadataURI
    ) {
        token = _token;
        startTime = _startTime;
        endTime = _endTime;
        minDepositAmount = _minDepositAmount;
        maxDepositAmount = _maxDepositAmount;
        salePrice = _salePrice;
        totalDepositPerUser = _totalDepositPerUser;
        whitelist = _options.whitelist;
        totalDeposits = _totalDeposit;
        vestingConfig = _vestingConfig;
        isFeatured = _options.isFeatured;
        metadataURI = _metadataURI;
    }

    /// @dev fallback function for sending eth directly to the contract
    receive() external payable {
        buyTokens();
    }

    /// @dev tracking how much eth(in wei) each address has deposited
    function buyTokens() public payable {
        // calculate how much ether the sender has already deposited
        uint userDeposit = _userDeposits[msg.sender];
        require(msg.value >= minDepositAmount && msg.value <= maxDepositAmount, "Invalid deposit amount");
        require(currentTime() <= endTime && currentTime() >= startTime, "Sale is not active");
        require(currentDeposit.add(msg.value) <= totalDeposits, "Not enough tokens to sell");
        require(userDeposit.add(msg.value) <= totalDepositPerUser, "You reached the token limit");

        if (whitelist) {
            require(whitelisted[msg.sender] == true, "Your address is not whitelisted");
        }

        currentDeposit = currentDeposit.add(msg.value);
        _userDeposits[msg.sender] = userDeposit.add(msg.value);

        emit BuyTokens(msg.sender, msg.value);
    }

    /// @param statemintReceiver Statemint address where the tokens will be minted
    function claimVestedTokens(string memory statemintReceiver) external {
        uint tokensToClaim = getUserClaimableTokens(msg.sender);
        require(tokensToClaim > 0, "No available tokens to claim");

        emit Claim(statemintReceiver, tokensToClaim, token);

        uint userClaimedTokens = tokensClaimed[msg.sender];
        tokensClaimed[msg.sender] = userClaimedTokens.add(tokensToClaim);
    }

    // Admin functions

    /// @param receiver Address to which funds are withdrawn
    /// @param amount Amount of ether to withdraw from contract
    function withdraw(address payable receiver, uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Amount to withdraw exceeds contract balance");

        receiver.transfer(amount);
    }

    /// @param isWhitelistable if set to true, only privileged(whitelisted) users can buy tokens
    function setWhitelisting(bool isWhitelistable) external onlyOwner {
        whitelist = isWhitelistable;

        emit SaleUpdated();
    }

    /// @dev admin user is not allowed to update start and end date when a sale is already active
    /// @param start unix timestamp when the token sale for the project starts
    /// @param end unix timestamp when the token sale for the project ends
    function setTimeDates(uint64 start, uint64 end) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        startTime = start;
        endTime = end;

        emit SaleUpdated();
    }

    /// @param minAmount minimal amount (in wei) of eth for which user can buy the project tokens
    /// @param maxAmount maximal amount(in wei) of eth for which user can buy the project tokens
    function setLimits( uint minAmount, uint maxAmount) external onlyOwner{
        minDepositAmount = minAmount;
        maxDepositAmount = maxAmount;

        emit SaleUpdated();
    }

    /// @dev admin user is not allowed to update the token id after a token sale is already active
    /// @param _token statemint token info
    function setToken(Vesting.Token memory _token) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        token = _token;

        emit SaleUpdated();
    }

    /// @dev admin user is not allowed to update the token price after the token sale is already active
    /// @param price how much project tokens can user purchase for 1 ETH
    function setSalePrice(uint price)external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        salePrice = price;

        emit SaleUpdated();
    }

    /// @dev admin user is not allowed to update the token id after the token sale is already active
    /// @param vestingOptions vesting configuration
    function updateVestingConfig(Vesting.VestingConfig memory vestingOptions) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        vestingConfig = vestingOptions;

        emit SaleUpdated();
    }

    /// @param _isFeatured - is this crowdSale featured
    function setFeatured(bool _isFeatured) external onlyOwner {
        isFeatured = _isFeatured;

        emit SaleUpdated();
    }

    /// @param _metadataURI - link on IPFS
    function setMetadataURI(string memory _metadataURI) external onlyOwner {
        metadataURI = _metadataURI;

        emit SaleUpdated();
    }

    // Read functions

    /// @dev return how much tokens can user currently claim taking in account vesting
    /// @param user user eth address
    function getUserClaimableTokens(address user) view public returns(uint) {
        if (currentTime() < vestingConfig.startTime) {
            return 0;
        }

        uint elapsedTime = currentTime().sub(vestingConfig.startTime);
        uint vestingDuration = vestingConfig.endTime.sub(vestingConfig.startTime);
        uint userTotalTokens = getUserTotalTokens(user);
        uint userClaimedTokens = tokensClaimed[user];

        if (elapsedTime > vestingDuration) {
            return userTotalTokens.sub(userClaimedTokens);
        }
        // calculate elapsed time percentage (elapsedTime/vestingDuration eg. 2days/10days = 20%)
        uint percentageToClaim = elapsedTime.mul(100).div(vestingDuration);
        // 20% of userTotalTokens
        uint userTokensToClaim = userTotalTokens.mul(percentageToClaim).div(100);

        return userTokensToClaim.sub(userClaimedTokens);
    }

    /// @dev dividing user deposit(in wei) by 1 eth because salePrice is number of tokens that user can buy for 1eth
    /// @param user The user eth address
    /// @return How much project token has the user bought
    function getUserTotalTokens(address user) view public returns(uint) {
        return _userDeposits[user].mul(salePrice).div(1 ether);
    }

    function currentTime() public view returns(uint256) {
        return block.timestamp;
    }
}
