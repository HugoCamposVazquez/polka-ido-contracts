// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Whitelisted is Ownable{
    mapping (address => bool) internal whitelisted;

    /// @param ethAddress users ethereum account address
    function addToWhitelist(address ethAddress) external onlyOwner{
        whitelisted[ethAddress] = true;
    }

    /// @param ethAddress users ethereum account address
    function removeFromWhitelist(address ethAddress) external onlyOwner{
        delete whitelisted[ethAddress];
    }

    /// @param ethAddress users ethereum account address
    /// @return true if the user is whitelisted, otherwise false
    function isWhitelisted(address ethAddress) view external returns(bool){
        return whitelisted[ethAddress];
    }
}
