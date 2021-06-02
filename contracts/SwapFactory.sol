// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SwapContract.sol";

contract SwapFactory is Ownable{

    SwapContract[] public contracts;

    function createSwapContract(
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
    ) public onlyOwner returns(SwapContract){

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
            _vestingContract
            );

            contracts.push(s);
            return s;
    }

    function getSwapContracts() public view returns (SwapContract[] memory){
        return contracts;
    }
}