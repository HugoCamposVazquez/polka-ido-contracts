// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Whitelisted is Ownable{
    mapping (address => bool) internal whitelisted;

    /// @param userAddress array of user addresses
    function addToWhitelist(address[] memory userAddress) external onlyOwner{
        for (uint i = 0; i< userAddress.length; i++) {
            whitelisted[userAddress[i]] = true;    
        }         
    }

    /// @param user user address that should be removed from the whitelist
    function removeFromWhitelist(address user) external onlyOwner{
        delete whitelisted[user];
    }

    /// @param user user address
    /// @return true if the user is whitelisted, otherwise false
    function isWhitelisted(address user) view external returns(bool){
        return whitelisted[user];
    }
}
