import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("SaleContractFactory", {from: deployer, args: []});
}
export default deployFunc;
