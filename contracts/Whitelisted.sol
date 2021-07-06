// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Whitelisted is Ownable{
    mapping (address => mapping (string => bool)) internal whitelisted;

    /// @param ethAddress users ethereum account address
    /// @param substrateAddress users statemint account address
    function addToWhitelist(address ethAddress, string memory substrateAddress) external onlyOwner{
        whitelisted[ethAddress][substrateAddress] = true;
    }

    /// @param ethAddress users ethereum account address
    /// @param substrateAddress users statemint account address
    function removeFromWhitelist(address ethAddress, string memory substrateAddress) external onlyOwner{
        delete whitelisted[ethAddress][substrateAddress];
    }

    /// @param ethAddress users ethereum account address
    /// @param substrateAddress users statemint account address
    /// @return true if the user is whitelisted, otherwise false
    function isWhitelisted(address ethAddress, string memory substrateAddress) view external returns(bool){
        return whitelisted[ethAddress][substrateAddress];
    }
}
