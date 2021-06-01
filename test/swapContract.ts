

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

  before(async () => {
    signers = await ethers.getSigners();
    Swap = await ethers.getContractFactory("SwapContract");
    ({ POT } = await deployments.fixture());
  });
  
  // NEGATIVE TESTS
  it("Should fail if not enough ether provided", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address);

    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("1"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Not enough ether sent");  
  });

  it("Should fail if too much ether provided", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address);
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("11"),
    })
    ).to.be.rejectedWith("VM Exception while processing transaction: revert Not enough ether sent");  
  });

  it("Should fail if the token sale ended", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 4)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address);
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("The pool is not active");  
  });

  it("Should fail if the pool token sale did not started yet", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() +1)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +4)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address);
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("The pool is not active");  
  });


  it("Should fail if all tokens are sold", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);

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
    ).to.be.rejectedWith("Error: VM Exception while processing transaction: revert Not enough tokens to sell");  
  });

  it("Should fail if you reached the token limit", async function() {

    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 5, POT.address);

    await signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("5"),
    });
    
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("Error: VM Exception while processing transaction: revert You reached the token limit");
  });

  it("Should fail if user address is not whitelisted", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, true, 1000, POT.address);
    
    await expect(
      signers[0].sendTransaction({
      to: swap.address,
      value: ethers.utils.parseEther("3"),
    })
    ).to.be.rejectedWith("Error: VM Exception while processing transaction: revert Your address is not whitelisted");
  });

  it("Should successfully buy tokens", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    
    await signers[0].sendTransaction({
    to: swap.address,
    value: ethers.utils.parseEther("3")});

    let userBalance = await swap.getUserUnclaimedAmount(signers[0].getAddress());
    userBalance = userBalance.toString();
    expect(userBalance).to.equal("300");
  });


  it("Should successfully buy tokens when user whitelisted", async function() {

    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    // create whitelistable pool
    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, true, 1000, POT.address);
    
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
      ).to.be.rejectedWith("Error: VM Exception while processing transaction: revert Your address is not whitelisted");

      // try to purchase the tokens with user that was never added to the whitelist
      await expect(
        signers[0].sendTransaction({
        to: swap.address,
        value: ethers.utils.parseEther("2"),
      })
      ).to.be.rejectedWith("Error: VM Exception while processing transaction: revert Your address is not whitelisted");

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

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    
    await expect(swap.setTimeDates(startDate, endDate))
    .to.be.rejectedWith("Error: VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully update startTime/endTime of the pool", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() +1)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +2)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    let startTimeValue = BigNumber.from(await swap.provider.getStorageAt(swap.address, 1)).toNumber();
    let endTimeValue = BigNumber.from(await swap.provider.getStorageAt(swap.address, 2)).toNumber();

    expect(startTimeValue).to.equal(startDate);
    expect(endTimeValue).to.equal(endDate);

    const updatedStartDate = Math.round(new Date().getTime() / 1000);
    const updatedEndDate = Math.round(new Date().getTime() / 1000);
    await swap.setTimeDates(updatedStartDate, updatedEndDate);
    startTimeValue = BigNumber.from(await swap.provider.getStorageAt(swap.address, 1)).toNumber();
    endTimeValue = BigNumber.from(await swap.provider.getStorageAt(swap.address, 2)).toNumber();
    expect(startTimeValue).to.equal(updatedStartDate);
    expect(endTimeValue).to.equal(updatedEndDate);
  });

  it("Should successfully change min and max swap amount", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    let minSwap = BigNumber.from(await swap.provider.getStorageAt(swap.address, 3)).toString();
    let maxSwap = BigNumber.from(await swap.provider.getStorageAt(swap.address, 4)).toString();

    expect(minSwap).to.equal((2 * Math.pow(10,18)).toString());
    expect(maxSwap).to.equal((5 * Math.pow(10,18)).toString());


    await swap.setLimits(1, 10);
    minSwap = BigNumber.from(await swap.provider.getStorageAt(swap.address, 3)).toString();
    maxSwap = BigNumber.from(await swap.provider.getStorageAt(swap.address, 4)).toString();
    expect(minSwap).to.equal((1 * Math.pow(10,18)).toString());
    expect(maxSwap).to.equal((10 * Math.pow(10,18)).toString());
  });

  it("Should successfully change token address", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() + 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);

    let tokenAdd = await ethers.utils.hexStripZeros(await swap.provider.getStorageAt(swap.address, 6));

    expect(tokenAdd).to.equal(POT.address.toLowerCase());
    const newAdd = await signers[3].getAddress();

    await swap.setTokenAddress(newAdd);
    tokenAdd = await ethers.utils.hexStripZeros(await swap.provider.getStorageAt(swap.address, 6));
    expect(tokenAdd).to.equal(newAdd.toLowerCase());
  });

  it("Should revert when trying to update tokenAddress if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    const newAdd = await signers[3].getAddress();

    await expect(
      swap.setTokenAddress(newAdd)
    )
    .to.be.rejectedWith("Error: VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully change swap price", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() +5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
    let swapPrice = BigNumber.from(await swap.provider.getStorageAt(swap.address, 5)).toNumber();

    expect(swapPrice).to.equal(100);


    await swap.setSwapPrice(500);
    swapPrice = BigNumber.from(await swap.provider.getStorageAt(swap.address, 5)).toNumber();
    expect(swapPrice).to.equal(500);
  });

  it("Should revert when trying to update swap price if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);

    await expect(swap.setSwapPrice(500))
    .to.be.rejectedWith("Error: VM Exception while processing transaction: revert The pool is already active");
  });

  it("Should successfully change vesting contract address", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() + 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));
    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);

    let vestingAdd = await ethers.utils.hexStripZeros(await swap.provider.getStorageAt(swap.address, 9));

    expect(vestingAdd).to.equal(POT.address.toLowerCase());
    const newAdd = await signers[3].getAddress();

    await swap.setVestingContract(newAdd);
    vestingAdd = await ethers.utils.hexStripZeros(await swap.provider.getStorageAt(swap.address, 9));
    expect(vestingAdd).to.equal(newAdd.toLowerCase());
  });

  it("Should revert when trying to update tokenAddress if pool already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const swap = await Swap.deploy(startDate, endDate, 2, 5, 10, 100, POT.address, false, 1000, POT.address);
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

    await expect(
      swapContract.setVestingContract(await signers[2].getAddress())
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: revert Ownable: caller is not the owner"
    );
  });
});





