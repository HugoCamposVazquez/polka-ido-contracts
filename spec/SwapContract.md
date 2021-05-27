# SwapContract

So called swap contract which is actually a pool/project investment contract where we use the constant swap ratio of
 ETH and project's tokens.

## Storage

### Public

- start time
- end time
- minimum swap amount (ETH)
- maximum swap amount (ETH)
- swap price
- token address (project's token)
- whitelist
- type (public/private)
- total deposits
- total deposit per user
- vesting contract address

## Write functions

### receive() external payable

Fallback function for receiving ETH that should be swapped for project's token.

### claimTokens()

Should call the vesting contract (which is TBD) to transfer all available tokens to `msg.sender`.

## Admin functions

### setWhitelisting(boolean)
### addToWhitelist(address[])
### removeFromWhitelist(address)
### setTimeDates(startTime: uint, endTime: uint)
### setLimits(minimum: uint, maximum: uint)
### setTokenAddress(address)
### setType(uint8)
### setSwapPrice(uint)
### setVestingContract(address)


## Read function

### isUserWhitelisted(address)
### getUserUnclaimedAmount(address)

Should call the vesting contract which is TBD.



