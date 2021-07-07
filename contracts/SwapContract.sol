// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "./Whitelisted.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SwapFactory.sol";
contract SwapContract is Ownable, Whitelisted{
    using SafeMath for uint;

    uint64 public startTime;
    uint64 public endTime;
    bool public whitelist;
    uint32 public tokenID;
    uint  public minSwapAmount;
    uint public maxSwapAmount;
    uint public swapPrice;
    uint public totalDeposits;
    uint public totalDepositPerUser;
    uint public currentDeposit;
    uint256 constant internal SECONDS_PER_DAY = 86400;

    event MakePurchase(string substrateAdd, uint amount, uint32 tokenID);
    event Claim(string substrateAdd, uint amount, uint32 tokenID);

    mapping (address => mapping (string => uint)) private _tokenMinted;
    mapping (address => mapping (string => uint)) private _userDeposits;

    Vesting.VestingConfig public vestingConfig;

    constructor(    
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    uint32 _tokenID,
    bool _whitelist,
    uint _totalDepositPerUser,
    Vesting.VestingConfig memory _vestingConfig
    )
    {
        tokenID = _tokenID;
        startTime = _startTime;
        endTime = _endTime;
        minSwapAmount = _minSwapAmount;
        maxSwapAmount = _maxSwapAmount;
        swapPrice = _swapPrice;
        whitelist = _whitelist;
        totalDeposits = _totalDeposit;
        totalDepositPerUser = _totalDepositPerUser;
        vestingConfig = _vestingConfig;
    }

    /// @dev We are tracking how much eth(in wei) each address has deposited
    function buy(string memory substrateAdd) external payable {
        // calculate how much ether the sender has already deposit
        uint userDeposit = _userDeposits[msg.sender][substrateAdd];
        require(msg.value >= minSwapAmount && msg.value <= maxSwapAmount, "Invalid deposit amount");
        require(block.timestamp <= endTime && block.timestamp >= startTime, "The pool is not active");
        require(currentDeposit.add(msg.value) <= totalDeposits, "Not enough tokens to sell");
        require(userDeposit.add(msg.value) <= totalDepositPerUser, "You reached the token limit");

        if (whitelist) {
            require(whitelisted[msg.sender][substrateAdd] == true, "Your address is not whitelisted");
        }

        currentDeposit = currentDeposit.add(msg.value);
        _userDeposits[msg.sender][substrateAdd] = userDeposit.add(msg.value);
        emit MakePurchase(substrateAdd, msg.value.div(1 ether).mul(swapPrice), tokenID);
    }

    // Admin functions

    /// @param isWhitelistable if set to true, only privileged(whitelisted) users can buy tokens
    function setWhitelisting(bool isWhitelistable) external onlyOwner {
        whitelist = isWhitelistable;
    }

    /// @dev admin user is not alowed to update start and end date when the pool is already active
    /// @param start unix timestamp when the token sale for the project starts
    /// @param end unix timestamp when the token sale for the project ends
    function setTimeDates(uint64 start, uint64 end)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        startTime = start;
        endTime = end;
    }

    /// @param minAmount minimal amount (in wei) of eth for which user can buy the project tokens
    /// @param maxAmount maximal amount(in wei) of eth for which user can buy the project tokens
    function setLimits( uint minAmount, uint maxAmount)external onlyOwner{
        minSwapAmount = minAmount;
        maxSwapAmount = maxAmount;
    }

    /// @dev admin user is not allowed to update the token id after the token sale is already active
    /// @param _tokenID statemint token id
    function setTokenID(uint32 _tokenID)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        tokenID = _tokenID;
    }

    /// @dev admin user is not allowed to update the token price after the token sale is already active
    /// @param price how much project tokens can user purchase for 1 ETH
    function setSwapPrice(uint price)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        swapPrice = price;
    }

    /// @dev admin user is not allowed to update the token id after the token sale is already active
    /// @param vestingOptions vesting configuration
    function updateVestingConfig(Vesting.VestingConfig memory vestingOptions)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        vestingConfig = vestingOptions;
    }

    // Read functions

    /// @dev deviding user deposit(in wei) by 1 eth becouse swapPrice is number of tokens that user can buy for 1eth
    /// @param ethAddress The user eth address
    /// @param substrateAdd The user statemint address
    /// @return How much project token has the user bought
    function getUserTotalTokens(address ethAddress, string memory substrateAdd ) view public returns(uint) {
        return _userDeposits[ethAddress][substrateAdd].div(1 ether).mul(swapPrice);
    }

    /// @notice Calculate the vested and unclaimed months and tokens available for `_grantId` to claim
    /// Due to rounding errors once grant duration is reached, returns the entire left grant amount
    /// Returns (0, 0) if cliff has not been reached
    function calculateGrantClaim(string memory substrateAdd) public view returns (uint256, uint256) {

        // For grants created with a future start date, that hasn't been reached, return 0, 0
        if (currentTime() < vestingConfig.startTime) {
            return (0, 0);
        }

        // Check cliff was reached
        uint elapsedTime = currentTime().sub(vestingConfig.startTime);
        uint elapsedDays = elapsedTime.div(SECONDS_PER_DAY);
        
        if (elapsedDays < vestingConfig.vestingCliff) {
            return (elapsedDays, 0);
        }
        uint userTokens = getUserTotalTokens(msg.sender, substrateAdd);

        uint tokensPerInterval = userTokens.mul(vestingConfig.percentageToMint).div(10000);

        return (tokensPerInterval, elapsedDays);
        // If over vesting duration, all tokens vested
/*         if (elapsedDays >= vestingConfig.vestingDuration) {
            uint256 remainingGrant = vestingConfig.amount.sub(vestingConfig.totalClaimed);
            return (vestingConfig.vestingDuration, remainingGrant);
        } else {
            uint256 daysVested = elapsedDays.sub(vestingConfig.daysClaimed);
            uint256 amountVestedPerDay = vestingConfig.amount.div(uint256(vestingConfig.vestingDuration));
            uint256 amountVested = uint256(daysVested.mul(amountVestedPerDay));
            return (daysVested, amountVested);
        } */
    }

    /// @notice Allows a grant recipient to claim their vested tokens. Errors if no tokens have vested
    /// It is advised recipients check they are entitled to claim via `calculateGrantClaim` before calling this
    function claimVestedTokens(string memory substrateAdd) external {
        uint256 tokensPerInterval;
        uint256 elapsedDays;
        (tokensPerInterval, elapsedDays) = calculateGrantClaim(substrateAdd);

        uint intervalCount = elapsedDays.div(vestingConfig.unlockInterval);
        require(_tokenMinted[msg.sender][substrateAdd] < tokensPerInterval.mul(intervalCount));

        emit Claim(substrateAdd, tokensPerInterval.mul(intervalCount)
        .sub(_tokenMinted[msg.sender][substrateAdd]), tokenID);

        _tokenMinted[msg.sender][substrateAdd] = _tokenMinted[msg.sender][substrateAdd]
        .add(tokensPerInterval.mul(intervalCount).sub(_tokenMinted[msg.sender][substrateAdd]));
    }

        function currentTime() public view returns(uint256) {
        return block.timestamp;
    }
}
