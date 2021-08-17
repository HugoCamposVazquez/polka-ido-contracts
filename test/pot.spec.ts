import {expect} from "chai";
import {Deployment} from "hardhat-deploy/types";
import { ethers, deployments } from "hardhat";
import { POT } from "../typechain/POT";

describe("Pot", function () {
  let POT: Deployment;
  let potToken: POT

  before(async () => {
    const [owner] = await ethers.getSigners();
    ({ POT } = await deployments.fixture());  
    potToken = (await ethers.getContractAt(
      POT.abi,
      POT.address,
      owner
    )) as POT;
  });

  it("Should create POT(erc20) token with defined amount of supply", async function () {
    const [owner] = await ethers.getSigners();

    let ownerBalance = await potToken.balanceOf(owner.address);
    expect((await potToken.totalSupply()).toNumber()).to.equal(ownerBalance.toNumber());
    expect(await potToken.name()).to.equal("Polkadotcom")
    expect(await potToken.symbol()).to.equal("POT")
    expect(await potToken.decimals()).to.equal(18)
  });

  it("Should successfully burn 100 tokens", async function () {
    const [owner] = await ethers.getSigners();
    await potToken.burn(100);

    let totalSupply = await potToken.totalSupply();
    let ownerBalance = await potToken.balanceOf(owner.address);
    expect(ownerBalance.toNumber()).to.equal(900);
    expect(totalSupply.toNumber()).to.equal(900);
  });
});
