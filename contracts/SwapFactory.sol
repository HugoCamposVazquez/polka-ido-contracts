// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "./SwapContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

library Vesting {
        struct VestingConfig {
        uint256 startTime;
        uint256 amount;
        uint256 vestingDuration;
        uint256 vestingCliff;
        uint256 daysClaimed;
        uint256 totalClaimed;
        uint interval;
        uint16 start; //unused
        uint16 unlockInterval; // in days
        uint8 percentageToMint;
    }
}
contract SwapFactory is Ownable{

    event SavePool(SwapContract tokenSaleAddress, uint32 tokenID, address senderAdd);

    function createSwapContract(
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    uint32 _token,
    bool _whitelist,
    uint _totalDepositPerUser,
    Vesting.VestingConfig memory vestingConfig
    ) public onlyOwner {

        SwapContract s = new SwapContract(
            _startTime,
            _endTime,
            _minSwapAmount,
            _maxSwapAmount,
            _totalDeposit,
            _swapPrice,
            _token,
            _whitelist,
            _totalDepositPerUser,
            vestingConfig
            );

        emit SavePool(s, _token, msg.sender);
    }
}