// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

contract Whitelisted {
    mapping (address => bool) internal list;

    /// @param userAddress array of user addresses
    function addUserTowhitelist(address[] memory userAddress) internal {
        for (uint i = 0; i< userAddress.length; i++) {
            list[userAddress[i]] = true;    
        }         
    }

    /// @param user user address that should be removed from the whitelist
    function deleteFromWhitelist(address user)internal{
        delete list[user];
    }

    /// @param user user address
    /// @return true if the user is whitelisted, otherwise false
    function isWhitelisted(address user) view internal returns(bool){
        return list[user];
    }
}
