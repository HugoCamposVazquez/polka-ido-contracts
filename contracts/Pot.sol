// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract POT is ERC20 {
    constructor(uint256 totalSupply) ERC20("Polkadotcom", "POT") {
        _mint(msg.sender, totalSupply);
    }
}
