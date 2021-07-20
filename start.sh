#!/usr/bin/env bash
# Use this script to test if a given TCP host/port are available

npx concurrently --raw --success first "npx hardhat node --hostname 0.0.0.0" "yarn deploy:localhost"