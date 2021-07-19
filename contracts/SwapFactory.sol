pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./VestingLib.sol";
import "./SaleStructs.sol";
import "./SwapContract.sol";


contract SwapFactory is Ownable{

    event SavePool(address tokenSaleAddress, Vesting.Token token, address senderAdd);

    function createSwapContract(
    uint64 _startTime,
    uint64 _endTime,
    uint _minSwapAmount,
    uint _maxSwapAmount,
    uint _totalDeposit,
    uint _swapPrice,
    uint _totalDepositPerUser,
    Vesting.Token memory _token,
    SaleType.Options memory _options,
    Vesting.VestingConfig memory vestingConfig,
    string memory _metadataURI
    ) external onlyOwner {

        SwapContract s = new SwapContract(
            _startTime,
            _endTime,
            _minSwapAmount,
            _maxSwapAmount,
            _totalDeposit,
            _swapPrice,
            _totalDepositPerUser,
            _token,
            _options,
            vestingConfig,
            _metadataURI
            );

        emit SavePool(address(s), _token, msg.sender);
    }
}
