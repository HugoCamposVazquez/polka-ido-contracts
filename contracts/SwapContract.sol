// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SwapContract is Ownable{
    using SafeMath for uint;

    uint startTime;
    uint endTime;
    uint minSwapAmount;
    uint maxSwapAmount;
    uint swapPrice;
    IERC20 token;
    bool whitelist;
    uint totalDeposits;
    uint totalDepositPerUser;
    address vestingContract;
    uint currentDeposit;
    mapping (address => bool) private whitelistedUsers;
    mapping (address => uint) private _balances;


    constructor(    
    uint _startTime,
    uint _endTime,
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
        minSwapAmount = _minSwapAmount * 1 ether;
        maxSwapAmount = _maxSwapAmount * 1 ether;
        swapPrice = _swapPrice;
        whitelist = _whitelist;
        totalDeposits = _totalDeposit * 1 ether;
        totalDepositPerUser = _totalDepositPerUser * 1 ether;
        vestingContract = _vestingContract;
    }

    receive() external payable {
        uint tokenAmount = msg.value.div(1 ether).mul(swapPrice);
        uint currentTime = block.timestamp;
        // calculate how much ether the sender has already deposit
        uint currUserDeposit = _balances[msg.sender].div(swapPrice) * 1 ether;
        require(msg.value >= minSwapAmount && msg.value <= maxSwapAmount, "Not enough ether sent");
        require(currentTime <= endTime && currentTime >= startTime, "The pool is not active");
        require(currentDeposit.add(msg.value) <= totalDeposits, "Not enough tokens to sell");
        require(currUserDeposit.add(msg.value) <= totalDepositPerUser, "Total deposit limit reached");

        if (whitelist) {
            require(whitelistedUsers[msg.sender] == true, "Your address is not whitelisted");
        }

        currentDeposit = currentDeposit.add(msg.value);
        _balances[msg.sender] = tokenAmount;
    }


function claimTokens() external {}

// Admin functions
function setWhitelisting(bool isWhitelistable) external onlyOwner {
    whitelist = isWhitelistable;
}


function addToWhitelist(address[] memory add)external onlyOwner{
    for (uint i = 0; i< add.length; i++) {
        whitelistedUsers[add[i]] = true;
    }
}

function removeFromWhitelist(address add)external onlyOwner{
   delete whitelistedUsers[add];
}


function setTimeDates(uint start, uint end)external onlyOwner{
    require(startTime > block.timestamp, "The pool is already active");
    startTime = start;
    endTime = end;
}


function setLimits( uint minAmount, uint maxAmount)external onlyOwner{
    minSwapAmount = minAmount * 1 ether;
    maxSwapAmount = maxAmount * 1 ether;
}


function setTokenAddress(IERC20 tokenAdd)external onlyOwner{
    require(startTime > block.timestamp, "The pool is already active");
    token = tokenAdd;
}

function setSwapPrice(uint price)external onlyOwner{
    require(startTime > block.timestamp, "The pool is already active");
    swapPrice = price;
}


function setVestingContract(address vestingAdd)external onlyOwner{ 
    require(startTime > block.timestamp, "The pool is already active");
    vestingContract = vestingAdd;
}

// Read functions
function isUserWhitelisted(address user) view external returns(bool){
    return whitelistedUsers[user];
}

function getUserUnclaimedAmount(address user) view external returns(uint) {
    return _balances[user];
}
}
