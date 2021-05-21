import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

  const Pot = await hre.ethers.getContractFactory("POT");
  const pot = await Pot.deploy(1000);

  await pot.deployed();
}
export default deployFunc;

// skip running this deployment script if deploying to mainnet - other/more networks are supported
deployFunc.skip = async (hre: HardhatRuntimeEnvironment) => {
  return hre.network.name === 'mainnet'
};
