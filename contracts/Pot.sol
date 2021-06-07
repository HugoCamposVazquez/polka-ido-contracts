// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract POT is ERC20Burnable {
    constructor(uint256 totalSupply) ERC20("Polkadotcom", "POT") {
        _mint(msg.sender, totalSupply);
    }
}
