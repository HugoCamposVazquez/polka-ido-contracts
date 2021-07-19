import { Signer } from "ethers";
import { SaleContractFactory } from "../typechain/SaleContractFactory";
import { ethers, deployments } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import { expect } from "chai";


describe("Sale Factory", function () {
    let signers: Signer[];
    let SaleContractFactory: Deployment;
    let SaleContractFactoryOwner: SaleContractFactory
    let saleFactory: SaleContractFactory

    before(async () => {
        signers = await ethers.getSigners();
        ({ SaleContractFactory } = await deployments.fixture());
        SaleContractFactoryOwner = (await ethers.getContractAt(
        SaleContractFactory.abi,
        SaleContractFactory.address,
        signers[0]
        )) as SaleContractFactory;

        saleFactory = (await ethers.getContractAt(
            "SaleContractFactory",
            SaleContractFactoryOwner.address,
            signers[1]
        )) as SaleContractFactory;
    });

  it("Should create new sale contract", async function () {

    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const tx = await SaleContractFactoryOwner.createSaleContract(startDate, endDate, 2, 10, 10000, 100,
        1000, {tokenID: 1, decimals: 0},  {whitelist: false, isFeatured: true}, {startTime: 7,unlockInterval: 30, percentageToMint: 10}, "http://ipfsLink.com");

    const txReceipt = await tx.wait(1);
    expect(txReceipt.events![1].event).to.equal("SavePool");
  });

  it("Should fail if createSaleContract is called with invalid owner", async function () {

    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    await expect(saleFactory.createSaleContract(startDate, endDate, 2, 10, 10000, 100,
            1000, {tokenID: 1, decimals: 0},  {whitelist: false, isFeatured: true}, {startTime: 7,unlockInterval: 30, percentageToMint: 10}, "http://ipfsLink.com")
      ).to.be.rejectedWith(
        "VM Exception while processing transaction: revert Ownable: caller is not the owner"
      );
  });
});
