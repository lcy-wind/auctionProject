const { ethers } = require("hardhat");

module.exports = async function ({ deployments }) {
  const { save } = deployments;

  const MyAuctionInfo = await deployments.get("MyAuctionProxy")
  // 部署工厂合约
  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  const auctionFactoryProxy = await upgrades.deployProxy(AuctionFactory,
    [
      MyAuctionInfo.args[0].implAddress,
    ],
    { initializer: "initialize" }
  );

  await auctionFactoryProxy.waitForDeployment();
  console.log("AuctionFactory deployed to:", await auctionFactoryProxy.getAddress());
  console.log("AuctionFactory 初始化完成");
  await save("AuctionFactory", {
    address: await auctionFactoryProxy.getAddress(),
    abi: AuctionFactory.interface.formatJson(),
    args: [],
    log: true,
  }
  );
}
module.exports.tags = ["AuctionFactoryDeploy"];