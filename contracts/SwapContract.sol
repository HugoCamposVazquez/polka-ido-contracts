// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "./Whitelisted.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SwapFactory.sol";
import "hardhat/console.sol";
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

    event Claim(string substrateAdd, uint amount, uint32 tokenID);

    mapping (address =>  uint) private tokensMinted;
    mapping (address =>  uint) private _userDeposits;

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
    receive() external payable {
        // calculate how much ether the sender has already deposit
        uint userDeposit = _userDeposits[msg.sender];
        require(msg.value >= minSwapAmount && msg.value <= maxSwapAmount, "Invalid deposit amount");
        require(currentTime() <= endTime && currentTime() >= startTime, "The pool is not active");
        require(currentDeposit.add(msg.value) <= totalDeposits, "Not enough tokens to sell");
        require(userDeposit.add(msg.value) <= totalDepositPerUser, "You reached the token limit");

        if (whitelist) {
            require(whitelisted[msg.sender] == true, "Your address is not whitelisted");
        }

        currentDeposit = currentDeposit.add(msg.value);
        _userDeposits[msg.sender] = userDeposit.add(msg.value);
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
        require(startTime > currentTime(), "The pool is already active");
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
        require(startTime > currentTime(), "The pool is already active");
        tokenID = _tokenID;
    }

    /// @dev admin user is not allowed to update the token price after the token sale is already active
    /// @param price how much project tokens can user purchase for 1 ETH
    function setSwapPrice(uint price)external onlyOwner{
        require(startTime > currentTime(), "The pool is already active");
        swapPrice = price;
    }

    /// @dev admin user is not allowed to update the token id after the token sale is already active
    /// @param vestingOptions vesting configuration
    function updateVestingConfig(Vesting.VestingConfig memory vestingOptions)external onlyOwner{
        require(startTime > currentTime(), "The pool is already active");
        vestingConfig = vestingOptions;
    }

    // Read functions

    /// @dev deviding user deposit(in wei) by 1 eth becouse swapPrice is number of tokens that user can buy for 1eth
    /// @param add The user eth address
    /// @return How much project token has the user bought
    function getUserTotalTokens(address add) view public returns(uint) {
        return _userDeposits[add].div(1 ether).mul(swapPrice);
    }

    /// @param substrateAdd Statemint addres where the tokens will be minted
    function claimVestedTokens(string memory substrateAdd) external {
        require (currentTime() >= vestingConfig.startTime, "Vesting didn't started yet");
        uint elapsedTime = currentTime().sub(vestingConfig.startTime);
        uint userTokens = getUserTotalTokens(msg.sender);
        uint userMintedTokens = tokensMinted[msg.sender];

        uint tokensPerInterval = userTokens.mul(vestingConfig.percentageToMint).div(100);

        uint intervalCount = elapsedTime.div(vestingConfig.unlockInterval);
        uint tokensToMintInInterval = tokensPerInterval.mul(intervalCount);

        require(userMintedTokens < tokensToMintInInterval, "You have no tokens to claim");

        // if vesting ended mint all remaining tokens
        if(tokensToMintInInterval >= userTokens && 
        userMintedTokens < userTokens) {
            emit Claim(substrateAdd, userTokens
                .sub(userMintedTokens), tokenID);

            tokensMinted[msg.sender] = userMintedTokens
                .add(userTokens.sub(userMintedTokens));
        }
        else {
            emit Claim(substrateAdd, tokensToMintInInterval
                .sub(userMintedTokens), tokenID);
                
            tokensMinted[msg.sender] = userMintedTokens
                .add(tokensToMintInInterval.sub(userMintedTokens));
        }
    }

    function currentTime() public view returns(uint256) {
    return block.timestamp;
}
}
