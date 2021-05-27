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
- whitelistedUsers
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

Enables or disables the whitelist requirement for the investment.

### addToWhitelist(address[])

Adds multiple addresses to the whitelist.

### removeFromWhitelist(address)

Removes and address from the whitelist.

### setTimeDates(startTime: uint, endTime: uint)

Sets new start time and end time for the sale.

### setLimits(minimum: uint, maximum: uint)

Sets new minimum and maximum swap (investment) limits.

### setTokenAddress(address)

Sets project's token contract address.

### setType(uint8)

Sets new sale type.

### setSwapPrice(uint)

Sets new swap price.

### setVestingContract(address)

Sets project's token vesting contract address.


## Read function

### isUserWhitelisted(address)

Returns true or false depending if user is whitelisted.

### getUserUnclaimedAmount(address)

Should call the vesting contract which is TBD.



