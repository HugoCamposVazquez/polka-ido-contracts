pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./VestingLib.sol";
import "./SaleStructs.sol";
import "./SaleContract.sol";


contract SaleContractFactory is Ownable{

    event CreatedSaleContract(address tokenSaleAddress, Vesting.Token token, address senderAdd);

    function createSaleContract(
        uint64 _startTime,
        uint64 _endTime,
        uint _minDepositAmount,
        uint _maxDepositAmount,
        uint _amountToRaise,
        uint _tokenPrice,
        Vesting.Token memory _token,
        SaleType.Options memory _options,
        Vesting.VestingConfig memory vestingConfig,
        string memory _metadataURI
    ) external onlyOwner {
        SaleContract s = new SaleContract(
            _startTime,
            _endTime,
            _minDepositAmount,
            _maxDepositAmount,
            _amountToRaise,
            _tokenPrice,
            _token,
            _options,
            vestingConfig,
            _metadataURI
        );
        s.transferOwnership(msg.sender);

        emit CreatedSaleContract(address(s), _token, msg.sender);
    }
}
