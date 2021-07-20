pragma solidity ^0.8.1;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./Whitelisted.sol";
import "./VestingLib.sol";
import "./SaleStructs.sol";

contract SaleContract is Whitelisted {
    using SafeMath for uint;

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
    mapping (address => uint) private tokensMinted;
    mapping (address => uint) private _userDeposits;

    Vesting.VestingConfig public vestingConfig;

    event Claim(string statemintReceiver, uint amount, Vesting.Token token);
    event BuyTokens(address user, uint amount);

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
    )
    {
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

    /// @dev We are tracking how much eth(in wei) each address has deposited
    receive() external payable {
        // calculate how much ether the sender has already deposit
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

    // Admin functions

    /// @param isWhitelistable if set to true, only privileged(whitelisted) users can buy tokens
    function setWhitelisting(bool isWhitelistable) external onlyOwner {
        whitelist = isWhitelistable;
    }

    /// @dev admin user is not alowed to update start and end date when a sale is already active
    /// @param start unix timestamp when the token sale for the project starts
    /// @param end unix timestamp when the token sale for the project ends
    function setTimeDates(uint64 start, uint64 end) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        startTime = start;
        endTime = end;
    }

    /// @param minAmount minimal amount (in wei) of eth for which user can buy the project tokens
    /// @param maxAmount maximal amount(in wei) of eth for which user can buy the project tokens
    function setLimits( uint minAmount, uint maxAmount) external onlyOwner{
        minDepositAmount = minAmount;
        maxDepositAmount = maxAmount;
    }

    /// @dev admin user is not allowed to update the token id after a token sale is already active
    /// @param _token statemint token info
    function setToken(Vesting.Token memory _token) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        token = _token;
    }

    /// @dev admin user is not allowed to update the token price after the token sale is already active
    /// @param price how much project tokens can user purchase for 1 ETH
    function setSalePrice(uint price)external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        salePrice = price;
    }

    /// @dev admin user is not allowed to update the token id after the token sale is already active
    /// @param vestingOptions vesting configuration
    function updateVestingConfig(Vesting.VestingConfig memory vestingOptions) external onlyOwner{
        require(startTime > currentTime(), "Sale is already active");
        vestingConfig = vestingOptions;
    }

    /// @param _isFeatured - is this crowdSale featured
    function setFeatured(bool _isFeatured) external onlyOwner {
        isFeatured = _isFeatured;
    }

    /// @param _metadataURI - link on IPFS
    function setMetadataURI(string memory _metadataURI) external onlyOwner {
        metadataURI = _metadataURI;
    }

    // Read functions

    /// @dev dividing user deposit(in wei) by 1 eth because salePrice is number of tokens that user can buy for 1eth
    /// @param user The user eth address
    /// @return How much project token has the user bought
    function getUserTotalTokens(address user) view public returns(uint) {
        return _userDeposits[user].mul(salePrice).div(1 ether);
    }

    /// @param statemintReceiver Statemint address where the tokens will be minted
    function claimVestedTokens(string memory statemintReceiver) external {
        require (currentTime() >= vestingConfig.startTime, "Vesting didn't started yet");
        uint elapsedTime = currentTime().sub(vestingConfig.startTime);
        uint userTotalTokens = getUserTotalTokens(msg.sender);
        uint userMintedTokens = tokensMinted[msg.sender];

        uint tokensPerInterval = userTotalTokens.mul(vestingConfig.percentageToMint).div(100);

        uint intervalCount = elapsedTime.div(vestingConfig.unlockInterval);
        uint tokensToMintInInterval = tokensPerInterval.mul(intervalCount);

        require(userMintedTokens < tokensToMintInInterval, "You have no tokens to claim");

        // if vesting ended claim all remaining tokens
        if(tokensToMintInInterval >= userTotalTokens &&
        userMintedTokens < userTotalTokens) {
            uint tokensToClaim = userTotalTokens.sub(userMintedTokens);
            emit Claim(statemintReceiver, tokensToClaim, token);
            tokensMinted[msg.sender] = userMintedTokens.add(tokensToClaim);
        }
        // vesting ongoing, only claim for the interval
        else if(userMintedTokens < userTotalTokens){
            uint tokensToClaim = tokensToMintInInterval.sub(userMintedTokens);
            emit Claim(statemintReceiver, tokensToClaim, token);
            tokensMinted[msg.sender] = userMintedTokens.add(tokensToClaim);
        }
    }

    function currentTime() public view returns(uint256) {
        return block.timestamp;
    }
}