import { Signer } from "ethers";
import { SwapFactory } from "../typechain/SwapFactory";
import { ethers, deployments } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import { expect } from "chai";


describe("Swap Factory", function () {
    let signers: Signer[];
    let SwapFactory: Deployment;
    let POT: Deployment;
    let SwapFactoryOwner: SwapFactory
    let swapFactory: SwapFactory
  
    before(async () => {
        signers = await ethers.getSigners();
        ({ SwapFactory, POT } = await deployments.fixture());
        SwapFactoryOwner = (await ethers.getContractAt(
        SwapFactory.abi,
        SwapFactory.address,
        signers[0]
        )) as SwapFactory;

        swapFactory = (await ethers.getContractAt(
            "SwapFactory",
            SwapFactoryOwner.address,
            signers[1]
        )) as SwapFactory;
    });

  it("Should create new swap contract", async function () {

    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));
    
    await SwapFactoryOwner.createSwapContract(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address);
    const res = await SwapFactoryOwner.getSwapContracts();
    expect(res.length).to.equal(1);
    expect(await ethers.utils.getAddress(res[0])).to.equal(res[0]);
  });

  it("Should fail if createSwapContract is called with invalid owner", async function () {
    
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    await expect(
        swapFactory.createSwapContract(startDate, endDate, 2, 10, 10000, 100, POT.address, false, 1000, POT.address)
      ).to.be.rejectedWith(
        "VM Exception while processing transaction: revert Ownable: caller is not the owner"
      );
  });
});
