const {ethers,upgrades} = require("hardhat")

module.exports = async function ({deployments}) {
  const {save} = deployments;
  // 部署AuctionV2合约 实现合约升级
  const AuctionV2 = await ethers.getContractFactory("AuctionV2");
  const MyAuctionProxy = await deployments.get("MyAuctionProxy")
  const proxyAddress = MyAuctionProxy.address;
  const upAuction =  await upgrades.upgradeProxy(proxyAddress, AuctionV2,
    { 
      unsafeAllow: ['constructor'] // 关键：必须添加，绕过构造函数校验
    });
  await upAuction.waitForDeployment();
  console.log("AuctionV2Contract implAddress to:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
  console.log("AuctionV2 初始化完成");
  await save("MyAuctionV2Proxy",{
    address: proxyAddress,
    abi: upAuction.interface.formatJson(),
    args:[{"implAddress": await upgrades.erc1967.getImplementationAddress(proxyAddress)}],
    log: true,
  });

}
module.exports.tags = ["AuctionV2Deploy"];