// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Whitelisted.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SwapContract is Ownable, Whitelisted{
    using SafeMath for uint;

    uint64 public startTime;
    uint64 public endTime;
    bool public whitelist;
    IERC20 public token;
    uint  public minSwapAmount;
    uint public maxSwapAmount;
    uint public swapPrice;
    uint public totalDeposits;
    uint public totalDepositPerUser;
    uint public currentDeposit;
    mapping (address => uint) private _userDeposits;
    address public vestingContract;

    constructor(    
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    IERC20 _token,
    bool _whitelist,
    uint _totalDepositPerUser,
    address _vestingContract
    )
    {
        token = _token;
        startTime = _startTime;
        endTime = _endTime;
        minSwapAmount = _minSwapAmount;
        maxSwapAmount = _maxSwapAmount;
        swapPrice = _swapPrice;
        whitelist = _whitelist;
        totalDeposits = _totalDeposit;
        totalDepositPerUser = _totalDepositPerUser;
        vestingContract = _vestingContract;
    }

    /// @dev We are tracking how much eth(in wei) each address has deposited
    receive() external payable {
        // calculate how much ether the sender has already deposit
        require(msg.value >= minSwapAmount && msg.value <= maxSwapAmount, "Invalid deposit amount");
        require(block.timestamp <= endTime && block.timestamp >= startTime, "The pool is not active");
        require(currentDeposit.add(msg.value) <= totalDeposits, "Not enough tokens to sell");
        require(_userDeposits[msg.sender].add(msg.value) <= totalDepositPerUser, "You reached the token limit");

        if (whitelist) {
            require(list[msg.sender] == true, "Your address is not whitelisted");
        }

        currentDeposit = currentDeposit.add(msg.value);
        _userDeposits[msg.sender] = _userDeposits[msg.sender].add(msg.value);
    }

    // Admin functions

    /// @param isWhitelistable if set to true, only privileged(whitelisted) users can buy tokens
    function setWhitelisting(bool isWhitelistable) external onlyOwner {
        whitelist = isWhitelistable;
    }

    /// @dev This function uses function from parent class (Whitelisted)
    /// @param add user address that will be whitelisted
    function addToWhitelist(address[] memory add)external onlyOwner{
        addUserTowhitelist(add);
    }

    /// @dev This function uses function from parent class (Whitelisted)
    /// @param add removes user address from whitelisted addresses
    function removeFromWhitelist(address add)external onlyOwner{
        deleteFromWhitelist(add);
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

    /// @dev admin user is not allowed to update the token address after the token sale is already active
    /// @param tokenAdd The address of the project's ERC20 token
    function setTokenAddress(IERC20 tokenAdd)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        token = tokenAdd;
    }

    /// @dev admin user is not allowed to update the token price after the token sale is already active
    /// @param price how much project tokens can user purchase for 1 ETH
    function setSwapPrice(uint price)external onlyOwner{
        require(startTime > block.timestamp, "The pool is already active");
        swapPrice = price;
    }

    /// @param vestingAdd -
    function setVestingContract(address vestingAdd)external onlyOwner{ 
        require(startTime > block.timestamp, "The pool is already active");
        vestingContract = vestingAdd;
    }

    // Read functions

    /// @param user The user address
    /// @return true if the provided user address is whitelisted, otherwise false
    function isUserWhitelisted(address user) view external returns(bool){
        return isWhitelisted(user);
    }

    /// @dev deviding user deposit(in wei) by 1 eth becouse swapPrice is number of tokens that user can buy for 1eth
    /// @param user The user address
    /// @return How much project token has the user bought
    function getUserUnclaimedAmount(address user) view external returns(uint) {
        return _userDeposits[user].div(1 ether).mul(swapPrice);
    }
}
