import { expect, use } from "chai";
import { ethers, deployments } from 'hardhat';
import { BigNumber, ContractFactory, Signer } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";
import { SaleContract } from "../typechain/SaleContract";

use(chaiAsPromised);
use(solidity);

describe("SaleContract", function () {
  let signers: Signer[];
  let SaleContractFactory: ContractFactory;
  const day = 86400
  const now = Math.round(Date.now() / 1000)

  async function deploySaleContract(
    start: number, end: number,
    minPurcValue: BigNumber,
    totalDeposit: BigNumber, whitelist: boolean,
    totalDepositPerUser: BigNumber,
    vesting: {
      startTime: number,
      endTime: number
    }
    ): Promise<SaleContract> {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() + start)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + end)) /1000));
    return await SaleContractFactory.deploy(
        startDate,
        endDate,
        minPurcValue,
        ethers.utils.parseEther("5"),
        totalDeposit,
        100,
        totalDepositPerUser,
        {tokenID: 1, decimals: 5, walletAddress: "address"},
        {whitelist, isFeatured: true},
        vesting,
        "http://ipfsLink.com"
    ) as SaleContract;
  }

  before(async () => {
    signers = await ethers.getSigners();
    SaleContractFactory = await ethers.getContractFactory("SaleContract");
    await deployments.fixture();
  });

  // NEGATIVE TESTS
  it("Should fail if not enough ether provided", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("1"),
      })
    ).to.be.rejectedWith("Invalid deposit amount");
  });

  it("Should fail if too much ether provided", async function() {

    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("11"),
      })
    ).to.be.rejectedWith("Invalid deposit amount");
  });

  it("Should fail if the token sale ended", async function() {
    const sale = await deploySaleContract(-5, 4, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("Sale is not active");
  });

  it("Should fail if a sale did not start yet", async function() {
    const sale = await deploySaleContract(1, 4, ethers.utils.parseEther("2"), ethers.utils.parseEther("10000"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("Sale is not active");
  });


  it("Should fail if all tokens are sold", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    // purchase 500 tokens
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("5")
    })

    // purchase 500 tokens, limit reached
    await signers[1].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("5"),
    })

    await expect(
      signers[2].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("Not enough tokens to sell");
  });

  it("Should fail if token limit reached", async function() {

    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("5"), {startTime: now , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("5")
    })

    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("You reached the token limit");
  });

  it("Should fail if user address is not whitelisted", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    true, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3"),
      })
    ).to.be.rejectedWith("Your address is not whitelisted");
  });

  it("Should successfully buy tokens via receive fallback", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("3")
      })).to.emit(sale, "BuyTokens")
    .withArgs(await signers[0].getAddress(), ethers.utils.parseEther("3"))

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
  });

  it("Should successfully buy tokens via buyTokens method", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      sale["buyTokens()"](
      {
        value: ethers.utils.parseEther("3")
      })).to.emit(sale, "BuyTokens")
    .withArgs(await signers[0].getAddress(), ethers.utils.parseEther("3"))

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
  });


  it("Should successfully buy tokens when user whitelisted", async function() {

    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    true, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    // add to the whitelist a user5
    await sale.addToWhitelist(await signers[5].getAddress());
    // purchase successfully tokens
    await signers[5].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3"),
    })

    let userBalance = await sale.getUserTotalTokens(await signers[5].getAddress());
    expect(userBalance.toString()).to.equal("300");

    // remove user5 from the whitelist
    await sale.removeFromWhitelist(await signers[5].getAddress());
    await expect(
      signers[5].sendTransaction(
        {
          to: sale.address,
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.rejectedWith("Your address is not whitelisted");

    // try to purchase the tokens with user that was never added to the whitelist
    await expect(
      signers[0].sendTransaction(
      {
        to: sale.address,
        value: ethers.utils.parseEther("2"),
      })
    ).to.be.rejectedWith("Your address is not whitelisted");

    await sale.setWhitelisting(false);
    // purchase tokens whit user that is not added to the whitelist
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("2"),
    })

    let user0Balance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(user0Balance.toString()).to.equal("200");
  });

  it("Should revert when trying to update startTime/endTime if sale already active", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() -5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +10)) /1000));

    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    await expect(sale.setTimeDates(startDate, endDate))
    .to.be.rejectedWith("Sale is already active");
  });

  it("Should successfully update startTime/endTime of a sale", async function() {
    const date = new Date();
    let startDate = Math.round((date.setDate((date.getDate() +1)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() +2)) /1000));

    const sale = await SaleContractFactory.deploy(startDate, endDate, 2, 5, ethers.utils.parseEther("10"),
    100, ethers.utils.parseEther("1000"), {tokenID: 1, decimals: 5}, {whitelist: true, isFeatured: false}, {startTime: 7, endTime: now + 10*day}, "ipfs://link");

    let startTimeValue = await sale.startTime()
    startTimeValue = startTimeValue.toNumber()
    let endTimeValue = await sale.endTime()
    endTimeValue = endTimeValue.toNumber()

    expect(startTimeValue).to.equal(startDate);
    expect(endTimeValue).to.equal(endDate);

    const updatedStartDate = Math.round(new Date().getTime() / 1000);
    const updatedEndDate = Math.round(new Date().getTime() / 1000);
    await sale.setTimeDates(updatedStartDate, updatedEndDate);
    startTimeValue = await sale.startTime()
    startTimeValue = startTimeValue.toNumber()
    endTimeValue = await sale.endTime()
    endTimeValue = endTimeValue.toNumber()
    expect(startTimeValue).to.equal(updatedStartDate);
    expect(endTimeValue).to.equal(updatedEndDate);
  });

  it("Should successfully change min and max sale amount", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    let minSale = await sale.minDepositAmount();
    let maxSale = await sale.maxDepositAmount();
    expect(minSale).to.deep.equal(ethers.utils.parseEther("2"));
    expect(maxSale).to.deep.equal(ethers.utils.parseEther("5"));

    await sale.setLimits(ethers.utils.parseEther("1"), ethers.utils.parseEther("10"));
    minSale = await sale.minDepositAmount();
    maxSale = await sale.maxDepositAmount();
    expect(minSale).to.deep.equal(ethers.utils.parseEther("1"));
    expect(maxSale).to.deep.equal(ethers.utils.parseEther("10"));
  });

  it("Should successfully change token address", async function() {
    const sale = await deploySaleContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    let token = await sale.token();
    expect(token[0]).to.be.equal(1);
    expect(token[1]).to.be.equal(5);
    await sale.setToken({tokenID: 2, decimals: 3, walletAddress: "address"});
    token = await sale.token();
    expect(token[0]).to.be.equal(2);
    expect(token[1]).to.be.equal(3);
  });

  it("Should revert when trying to update tokenAddress if sale already active", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      sale.setToken({tokenID: 2, decimals: 3, walletAddress: "address"})
    )
    .to.be.rejectedWith("Sale is already active");
  });

  it("Should successfully change sale price", async function() {
    const sale = await deploySaleContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    let salePrice = await sale.salePrice();

    expect(salePrice.toString()).to.equal("100");

    await sale.setSalePrice(500);
    salePrice = await sale.salePrice();
    expect(salePrice.toString()).to.equal("500");
  });

  it("Should successfully change isFeatured option", async function() {
    const sale = await deploySaleContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    let isFeatured = await sale.isFeatured();

    expect(isFeatured).to.be.true;

    await sale.setFeatured(false);
    isFeatured = await sale.isFeatured();

    expect(isFeatured).to.be.false;
  });

  it("Should successfully change metadataURI", async function() {
    const sale = await deploySaleContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    let metadataURI = await sale.metadataURI();

    expect(metadataURI).to.be.equal("http://ipfsLink.com");

    await sale.setMetadataURI("http://ipfsLinkChanged.com");
    metadataURI = await sale.metadataURI();

    expect(metadataURI).to.be.equal("http://ipfsLinkChanged.com");
    });


  it("Should successfully update vesting config", async function() {
    const sale = await deploySaleContract(5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});
    let vestingOptions = await sale.vestingConfig();
    expect(vestingOptions).to.be.deep.equal([now, now + 10*day]);

    await sale.updateVestingConfig({startTime: now + 10, endTime: now + 20*day});
    vestingOptions = await sale.vestingConfig();
    expect(vestingOptions).to.be.deep.equal([now + 10, now + 20*day]);
  });

  it("Should revert when trying to update vesting config if sale already active", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(
      sale.updateVestingConfig({startTime: 10, endTime: now + 10*day})
    )
    .to.be.rejectedWith("Sale is already active");
  });

  it("Should revert when trying to update sale price if sale already active", async function() {
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now , endTime: now + 10*day});

    await expect(sale.setSalePrice(500))
    .to.be.rejectedWith("Sale is already active");
  });

  it("Should revert when non owner trying to update token sale", async function() {
    const date = new Date();
    const startDate = Math.round((date.setDate((date.getDate() - 5)) /1000));
    const endDate = Math.round((date.setDate((date.getDate() + 10)) /1000));

    const sale = await SaleContractFactory.deploy(startDate, endDate, 2, 5, 10, 100, 1000, {tokenID: 1, decimals: 5}, {whitelist: true, isFeatured: false},
    {startTime: 7,endTime: now + 10*day}, "ipfs://link");

    const saleContract = (await ethers.getContractAt(
      "SaleContract",
      sale.address,
      signers[1]
    ));
    await expect(
      saleContract.setLimits(1, 10)
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.setWhitelisting(true)
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.addToWhitelist(signers[5].getAddress())
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.removeFromWhitelist(signers[5].getAddress())
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.setTimeDates(startDate, endDate)
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.setToken({tokenID: 2, decimals: 3, walletAddress: "address"})
    ).to.be.rejectedWith(
      "aller is not the owner"
    );

    await expect(
      saleContract.setSalePrice(10)
    ).to.be.rejectedWith(
      "caller is not the owner"
    );


    await expect(
      saleContract.updateVestingConfig({startTime: 10, endTime: now + 10*day})
    ).to.be.rejectedWith(
      "caller is not the owner"
    );

    await expect(
      saleContract.setMetadataURI("http://ipfsLink.com")
    ).to.be.rejectedWith(
      "caller is not the owner"
    );
  });

  // test claiming tokens
  it("should successfuly claim user tokens", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 8*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(sale, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 60, [ 1, 5 ])
  });

  it("Should revert when vesting didn't start yet", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now + 2 * day , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("No available tokens to claim")
});

  it("Should revert when no tokens to claim", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 10*day});

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("0");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("No available tokens to claim")
  });

  it("Should succesfully claim user tokens after vesting ended", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 15 * day , endTime: now - 5*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(sale, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 300, [1, 5])
  });

  it("Should succesfully claim user tokens when purchased tokens for less than 1 eth", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("0"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 15 * day , endTime: now - day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("0.5")
    })

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("50");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(sale, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 50, [1, 5])
  });

  it("Should revert when user has less than 1% tokens to claim", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 100, endTime: now + 10*day});

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("0");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("No available tokens to claim")
  });

  it("should revert after user has already claimed all his tokens", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 8*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    let userBalance = await sale.getUserTotalTokens(await signers[0].getAddress());
    expect(userBalance.toString()).to.equal("300");
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU")).to.emit(sale, "Claim")
    .withArgs("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU", 60, [ 1, 5 ])
    await expect(sale.claimVestedTokens("13YYqaYvBrJpr3upTqNCbRXS2vsAFR6v7xGK9VSuHBJaqKyU"))
    .to.be.rejectedWith("No available tokens to claim")
  });

  it("Should successfully return user claimable tokens that are available", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 8*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    const claimableTokens = await sale.getUserClaimableTokens(await signers[0].getAddress());
    expect(claimableTokens.toString()).to.equal("60");
  });

  it("Should successfully return 0 claimable tokens if vesting didn't start yet", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now + 2 * day , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    const claimableTokens = await sale.getUserClaimableTokens(await signers[0].getAddress());

    expect(claimableTokens.toString()).to.equal("0");
  });

  it("Should successfully return user total tokens if vesting passed", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 12 * day , endTime: now - 3*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    const claimableTokens = await sale.getUserClaimableTokens(await signers[0].getAddress());

    expect(claimableTokens.toString()).to.equal("300");
  });

  it("Should fail to withdraw ether from contract if not owner", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    const saleContract = (await ethers.getContractAt(
      "SaleContract",
      sale.address,
      signers[1]
    ));

    await expect(
      saleContract.withdraw(await signers[7].getAddress(), 100)
    ).to.be.rejectedWith(
      "caller is not the owner"
    );
  });

  it("Should fail to withdraw more ether than on contract", async function(){
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    await expect(
      sale.withdraw(await signers[7].getAddress(), ethers.utils.parseEther("4"))
    ).to.be.rejectedWith(
      "Amount to withdraw exceeds contract balance"
    );
  });

  it("Should successfully withdraw ether from contract", async function(){
    const initialReceiverBalance = await signers[7].getBalance();
    const sale = await deploySaleContract(-5, 10, ethers.utils.parseEther("2"), ethers.utils.parseEther("10"),
    false, ethers.utils.parseEther("1000"), {startTime: now - 2 * day , endTime: now + 10*day});
    await signers[0].sendTransaction(
    {
      to: sale.address,
      value: ethers.utils.parseEther("3")
    })

    await sale.withdraw(await signers[7].getAddress(), ethers.utils.parseEther("3"))

    expect((await signers[7].getBalance()).sub(initialReceiverBalance)).to.be.deep.equal(ethers.utils.parseEther("3"));
  });
});
