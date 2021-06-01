import {expect} from "chai";
import { ethers, deployments } from "hardhat";


describe("Pot", function () {

  before(async () => {
    await deployments.fixture();
  });

  it("Should create POT(erc20) token with defined amount of supply", async function () {
    
    const [owner] = await ethers.getSigners();
    const Pot = await ethers.getContractFactory("POT");
    const potToken = await Pot.deploy(100);

    const ownerBalance = await potToken.balanceOf(owner.address);
    expect((await potToken.totalSupply()).toNumber()).to.equal(ownerBalance.toNumber());
    expect(await potToken.name()).to.equal("Polkadotcom")
    expect(await potToken.symbol()).to.equal("POT")
    expect(await potToken.decimals()).to.equal(18)
  });
});
