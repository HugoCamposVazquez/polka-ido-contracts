import { expect, use } from "chai";
import { ethers, deployments } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";
use(chaiAsPromised);
use(solidity);

describe("SwapContract", function () {
  let signers: Signer[];
  let Swap: ContractFactory;
  const day = 86400
  const now = Math.round(Date.now() / 1000)

  async function deploySwapContract(
    start: number, end: number,
    minPurcValue: BigNumber,
    totalDeposit: BigNumber, whitelist: boolean,
    totalDepositPerUser: BigNumber, 
    vesting: {startTime: number, 
    unlockInterval: number,
    percentageToMint: number}) {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() + start)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + end)) /1000));
    return await Swap.deploy(startDate, endDate, minPurcValue, 
    ethers.utils.parseEther("5"), totalDeposit, 100, {tokenID: 1, decimals: 5}, whitelist, totalDepositPerUser, vesting, true);
  }

  before(async () => {
    signers = await ethers.getSigners();
    Swap = await ethers.getContractFactory("SwapContract");
    await deployments.fixture();
  });
  
  // NEGATIVE TESTS
  it("Should fail if not enough ether provided", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("1"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Invalid deposit amount");  
  });

  it("Should fail if too much ether provided", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("11"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Invalid deposit amount");  
  });

  it("Should fail if the token sale ended", async function() {
    const swap = await deploySwapContract(-5, 4, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("The pool is not active");  
  });

  it("Should fail if the pool token sale did not started yet", async function() {
    const swap = await deploySwapContract(1, 4, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("The pool is not active");  
  });


  it("Should fail if all tokens are sold", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    // purchase 500 tokens
    await signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("5")
    })

    // purchase 500 tokens, limit reached
    await signers[1].sendTransaction(  
    {
      to: swap.address,
      value: ethers.utils.parseEther("5"),
    })
    
    await expect(
      signers[2].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Not enough tokens to sell");  
  });

  it("Should fail if you reached the token limit", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("5"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    await signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("5")
    })
    
    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert You reached the token limit");
  });

  it("Should fail if user address is not whitelisted", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    true, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");
  });

  it("Should successfully buy tokens", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3")
    })
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
  });


  it("Should successfully buy tokens when user whitelisted", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    true, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    // add to the whitelist a user5
    await swap.addToWhitelist(signers[5].getAddress());
    // purchase successfuly tokens

    await signers[5].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[5].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
  
    // remove user5 from the whitelist
    await swap.removeFromWhitelist(signers[5].getAddress());
    await expect(
      signers[5].sendTransaction( 
        {
          to: swap.address,
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");

    // try to purchase the tokens with user that was never added to the whitelist
    await expect(
      signers[0].sendTransaction( 
      {
        to: swap.address,
        value: ethers.utils.parseEther("2"),
      })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");

    // set the pool to whitelist: false
    await swap.setWhitelisting(false);
    // purchase tokens whit user that is not added to the whitelist
    await signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("2"),
    })

    let user0Balance = await swap.getUserTotalTokens(signers[0].getAddress());
    user0Balance = user0Balance.toString();
    expect(user0Balance).to.equal("200");
  });

  it("Should revert when trying to update startTime/endTime if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    await expect(swap.setTimeDates(startDate, endDate))
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully update startTime/endTime of the pool", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() +1)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +2)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, ethers.utils.parseEther("10"), 
    100, {tokenID: 1, decimals: 5}, false, ethers.utils.parseEther("1000"), {startTime: 7,unlockInterval: 30, percentageToMint: 10}, true);

    let startTimeValue = await swap.startTime()
    startTimeValue = startTimeValue.toNumber()
    let endTimeValue = await swap.endTime()
    endTimeValue = endTimeValue.toNumber()

    expect(startTimeValue).to.equal(startDate);
    expect(endTimeValue).to.equal(endDate);

    const updatedStartDate = Math.round(new Date().getTime() / 1000);
    const updatedEndDate = Math.round(new Date().getTime() / 1000);
    await swap.setTimeDates(updatedStartDate, updatedEndDate);
    startTimeValue = await swap.startTime()
    startTimeValue = startTimeValue.toNumber()
    endTimeValue = await swap.endTime()
    endTimeValue = endTimeValue.toNumber()
    expect(startTimeValue).to.equal(updatedStartDate);
    expect(endTimeValue).to.equal(updatedEndDate);
  });

  it("Should successfully change min and max swap amount", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    let minSwap = await swap.minSwapAmount();
    let maxSwap = await swap.maxSwapAmount();
    expect(minSwap).to.deep.equal(ethers.utils.parseEther("2"));
    expect(maxSwap).to.deep.equal(ethers.utils.parseEther("5"));

    await swap.setLimits(ethers.utils.parseEther("1"), ethers.utils.parseEther("10"));
    minSwap = await swap.minSwapAmount();
    maxSwap = await swap.maxSwapAmount();
    expect(minSwap).to.deep.equal(ethers.utils.parseEther("1"));
    expect(maxSwap).to.deep.equal(ethers.utils.parseEther("10"));
  });

  it("Should successfully change token address", async function() {
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    let token = await swap.token();
    expect(token[0]).to.be.equal(1);
    expect(token[1]).to.be.equal(5);
    await swap.setToken({tokenID: 2, decimals: 3});
    token = await swap.token();
    expect(token[0]).to.be.equal(2);
    expect(token[1]).to.be.equal(3);
  });

  it("Should revert when trying to update tokenAddress if pool already active", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    await expect(
      swap.setToken({tokenID: 2, decimals: 3})
    )
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully change swap price", async function() {
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    let swapPrice = await swap.swapPrice();
    swapPrice = swapPrice.toNumber();

    expect(swapPrice).to.equal(100);

    await swap.setSwapPrice(500);
    swapPrice = await swap.swapPrice();
    swapPrice = swapPrice.toNumber();

    expect(swapPrice).to.equal(500);
  });

  it("Should successfully change isFeatured option", async function() {
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    let isFeatured = await swap.isFeatured();

    expect(isFeatured).to.be.true;

    await swap.setFeatured(false);
    isFeatured = await swap.isFeatured();

    expect(isFeatured).to.be.false;
  });


  it("Should successfully update vesting config", async function() {
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});
    let vestingOptions = await swap.vestingConfig();
    expect(vestingOptions).to.be.deep.equal([now, 5, 10]);

    await swap.updateVestingConfig({startTime: now + 10, unlockInterval: 360, percentageToMint: 15});
    vestingOptions = await swap.vestingConfig();
    expect(vestingOptions).to.be.deep.equal([now + 10, 360, 15]);
  });

  it("Should revert when trying to update vesting config if pool already active", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    await expect(
      swap.updateVestingConfig({startTime: 10,unlockInterval: 60, percentageToMint: 25})
    )
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should revert when trying to update swap price if pool already active", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"), 
    false, ethers.utils.parseEther("1000"), {startTime: now , unlockInterval: 5, percentageToMint: 10});

    await expect(swap.setSwapPrice(500))
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should revert when non owner trying to update token sale", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, {tokenID: 1, decimals: 5}, false, 1000, 
    {startTime: 7,unlockInterval: 30, percentageToMint: 10}, true);

    const swapContract = (await ethers.getContractAt(
      "SwapContract",
      swap.address,
      signers[1]
    ));
    await expect(
      swapContract.setLimits(1, 10)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.setWhitelisting(true)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.addToWhitelist(signers[5].getAddress())
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.removeFromWhitelist(signers[5].getAddress())
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.setTimeDates(startDate, endDate)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.setToken({tokenID: 2, decimals: 3})
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.setSwapPrice(10)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.updateVestingConfig({startTime: 10,unlockInterval: 60, percentageToMint: 25})
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );
  });

  // test claiming tokens
  it("should successfuly claim user tokens", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , unlockInterval: day, percentageToMint: 10});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3")
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(swap, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 60, [ 1, 5 ])
  });

  it("Should revert when vesting didn't started yet", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now + 2 * day , unlockInterval: day, percentageToMint: 10});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3")
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("VM Exception while processing transaction: revert Vesting didn't started yet")
});

  it("Should revert when no tokens to claim", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , unlockInterval: day, percentageToMint: 10});

    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("0");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("VM Exception while processing transaction: revert You have no tokens to claim")
  });

  it("Should succesfully claim user tokens after vesting ended", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 15 * day , unlockInterval: day, percentageToMint: 10});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3")
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(swap, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 300, [1, 5])
  });

  it("Should succesfully claim user tokens when 100% devided by percentageToMint not a whole number", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 4 * day , unlockInterval: day, percentageToMint: 33});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("3")
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(swap, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 300, [1, 5])
  });

  it("Should succesfully claim user tokens when purchased tokens for les than 1 eth", async function(){
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("0"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 15 * day , unlockInterval: day, percentageToMint: 10});
    signers[0].sendTransaction( 
    {
      to: swap.address,
      value: ethers.utils.parseEther("0.5")
    })
    
    let userBalance = await swap.getUserTotalTokens(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("50");
    await expect(swap.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(swap, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 50, [1, 5])
  });
});




