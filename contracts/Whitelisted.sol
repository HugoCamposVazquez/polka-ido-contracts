// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Whitelisted is Ownable{
    mapping (address => bool) internal whitelisted;

    /// @param ethAddresses users ethereum account addresses
    function addToWhitelist(address[] memory ethAddresses) external onlyOwner{
        for (uint i =0; i < ethAddresses.length; i++) {
            whitelisted[ethAddresses[i]] = true;
        }
    }

    /// @param ethAddresses users ethereum account addresses
    function removeFromWhitelist(address[] memory ethAddresses) external onlyOwner{
        for (uint i =0; i < ethAddresses.length; i++) {
            delete whitelisted[ethAddresses[i]];
        }
    }

    /// @param ethAddress users ethereum account address
    /// @return true if the user is whitelisted, otherwise false
    function isWhitelisted(address ethAddress) view external returns(bool){
        return whitelisted[ethAddress];
    }
}
