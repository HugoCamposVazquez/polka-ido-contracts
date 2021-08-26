pragma solidity ^0.8.1;

library Vesting {
    struct VestingConfig {
        uint32 startTime; // in seconds
        uint32 endTime; // in seconds
    }
    struct Token {
        uint32 tokenID;
        uint8 decimals;
        string walletAddress;
    }
}
