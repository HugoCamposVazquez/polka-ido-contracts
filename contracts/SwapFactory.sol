// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "./SwapContract.sol";

contract SwapFactory is Ownable{

    event SavePool(SwapContract tokenSaleAddress, string tokenName);

    function createSwapContract(
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    string memory _token,
    bool _whitelist,
    uint _totalDepositPerUser
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
            _totalDepositPerUser
            );

        emit SavePool(s, _token);
    }
}