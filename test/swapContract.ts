

import { expect, use } from "chai";
import { ethers, deployments } from 'hardhat';
import { Deployment } from "hardhat-deploy/dist/types";
import { BigNumber, ContractFactory, Signer } from "ethers";
import chaiAsPromised from "chai-as-promised";
use(chaiAsPromised);

describe("SwapContract", function () {
  let signers: Signer[];
  let POT: Deployment;
  let Swap: ContractFactory;

  async function deploySwapContract(start: number, end: number, totalDeposit: BigNumber, whitelist: boolean, totalDepositPerUser: BigNumber) {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() + start)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + end)) /1000));
    return await Swap.deploy(startDate, endDate, ethers.utils.parseEther("2"), 
    ethers.utils.parseEther("5"), totalDeposit, 100, POT.address, whitelist, totalDepositPerUser);
  }

  before(async () => {
    signers = await ethers.getSigners();
    Swap = await ethers.getContractFactory("SwapContract");
    ({ POT } = await deployments.fixture());
  });
  
  // NEGATIVE TESTS
  it("Should fail if not enough ether provided", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10000"), false, ethers.utils.parseEther("1000"));

    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("1"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Invalid deposit amount");  
  });

  it("Should fail if too much ether provided", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10000"), false, ethers.utils.parseEther("1000"));
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("11"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Invalid deposit amount");  
  });

  it("Should fail if the token sale ended", async function() {
    const swap = await deploySwapContract(-5, 4, ethers.utils.parseEther("10000"), false, ethers.utils.parseEther("1000"));
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("The pool is not active");  
  });

  it("Should fail if the pool token sale did not started yet", async function() {
    const swap = await deploySwapContract(1, 4, ethers.utils.parseEther("10000"), false, ethers.utils.parseEther("1000"));

    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("The pool is not active");  
  });


  it("Should fail if all tokens are sold", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));

    // purchase 500 tokens
    await signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("5"),
    });

    // purchase 500 tokens, limit reached
    await signers[1].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("5"),
    });
    
    await expect(
      signers[2].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Not enough tokens to sell");  
  });

  it("Should fail if you reached the token limit", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("5"));
    await signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("5"),
    });
    
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert You reached the token limit");
  });

  it("Should fail if user address is not whitelisted", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), true, ethers.utils.parseEther("1000"));
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");
  });

  it("Should successfully buy tokens", async function() {    
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));
    await signers[0].sendTransaction({
    to: swap.address,
    value: ethers.utils.parseEther("3")});

    let userBalance = await swap.getUserUnclaimedAmount(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
  });


  it("Should successfully buy tokens when user whitelisted", async function() {

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), true, ethers.utils.parseEther("1000"));
    // add to the whitelist a user5
    await swap.addToWhitelist([signers[5].getAddress()]);
    // purchase successfuly tokens
    await signers[5].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3")});
  
      let userBalance = await swap.getUserUnclaimedAmount(signers[5].getAddress());
      userBalance = userBalance.toString();
      expect(userBalance).to.equal("300");
    
      // remove user5 from the whitelist
      await swap.removeFromWhitelist(signers[5].getAddress());
      await expect(
        signers[5].sendTransaction({
        to: swap.address,
        value: ethers.utils.parseEther("2"),
      })
      ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");

      // try to purchase the tokens with user that was never added to the whitelist
      await expect(
        signers[0].sendTransaction({
        to: swap.address,
        value: ethers.utils.parseEther("2"),
      })
      ).to.be.rejectedWith("VM Exception while processing transaction: revert Your address is not whitelisted");

      // set the pool to whitelist: false
      await swap.setWhitelisting(false);
      // purchase tokens whit user that is not added to the whitelist
      await signers[0].sendTransaction({
        to: swap.address,
        value: ethers.utils.parseEther("2")});
    
        let user0Balance = await swap.getUserUnclaimedAmount(signers[0].getAddress());
        user0Balance = user0Balance.toString();
        expect(user0Balance).to.equal("200");
    });

  it("Should revert when trying to update startTime/endTime if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));
    await expect(swap.setTimeDates(startDate, endDate))
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully update startTime/endTime of the pool", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() +1)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +2)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, ethers.utils.parseEther("10"), 
    100, POT.address, false, ethers.utils.parseEther("1000"));

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
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));
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
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));

    let tokenAdd = await swap.token();
    expect(tokenAdd).to.equal(POT.address);
    const newAdd = await signers[3].getAddress();

    await swap.setTokenAddress(newAdd);
    tokenAdd = await swap.token();
    expect(tokenAdd).to.equal(newAdd);
  });

  it("Should revert when trying to update tokenAddress if pool already active", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));
    const newAdd = await signers[3].getAddress();

    await expect(
      swap.setTokenAddress(newAdd)
    )
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully change swap price", async function() {
    const swap = await deploySwapContract(5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));
    let swapPrice = await swap.swapPrice();
    swapPrice = swapPrice.toNumber();

    expect(swapPrice).to.equal(100);

    await swap.setSwapPrice(500);
    swapPrice = await swap.swapPrice();
    swapPrice = swapPrice.toNumber();

    expect(swapPrice).to.equal(500);
  });

  it("Should revert when trying to update swap price if pool already active", async function() {
    const swap = await deploySwapContract(-5, 10, ethers.utils.parseEther("10"), false, ethers.utils.parseEther("1000"));

    await expect(swap.setSwapPrice(500))
    .to.be.rejectedWith("VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should revert when trying to update tokenAddress if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000);

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
      swapContract.addToWhitelist([signers[5].getAddress()])
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
      swapContract.setTokenAddress(await signers[2].getAddress())
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );

    await expect(
      swapContract.setSwapPrice(10)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );
  });
});




