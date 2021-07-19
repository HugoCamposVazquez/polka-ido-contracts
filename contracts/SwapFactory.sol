// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "./SwapContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

library Vesting {
    struct VestingConfig {
        uint32 startTime; // in secodns
        uint32 unlockInterval; // in seconds
        uint8 percentageToMint;
    }
    struct Token {
        uint32 tokenID;
        uint8 decimals;
    }
}
contract SwapFactory is Ownable{

    event SavePool(SwapContract tokenSaleAddress, Vesting.Token token, address senderAdd);

    function createSwapContract(
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    Vesting.Token memory _token,
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