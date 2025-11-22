const { ethers, upgrades } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer } = await getNamedAccounts();
  const { save } = deployments;
  const MyERC721Info = await deployments.get("MyERC721")
  const MyERC721 = await ethers.getContractAt("MyERC721", MyERC721Info.address);
  const tokenId = (await MyERC721.tokenCountId()) - 1n;
  const MyERC721Address = MyERC721Info.address;

  // 2. 部署 Auction 代理合约（禁用自动初始化）
  const MyAuction = await ethers.getContractFactory("Auction");
  const MyAuctionContract = await upgrades.deployProxy(
    MyAuction,
    [], 
    { 
      unsafeAllow: ['constructor'],
      initializer: false // 禁用自动初始化
    }
  );
  await MyAuctionContract.waitForDeployment();
  const auctionProxyAddress = await MyAuctionContract.getAddress();

  // 5. 手动调用 initialize 初始化 Auction 合约
  await MyAuctionContract.initialize(
    100n, // duration
    10000000000000000n, // startPrice
    MyERC721Address,
    tokenId,
    deployer
  );

  // 6. 保存部署信息
  const auctionImplAddress = await upgrades.erc1967.getImplementationAddress(auctionProxyAddress);
  console.log("Auction 实现合约地址:", auctionImplAddress);
  console.log("Auction 合约初始化完成");

  
  await save("MyAuctionProxy", {
    address: auctionProxyAddress,
    abi: MyAuction.interface.formatJson(),
    args: [{"implAddress": auctionImplAddress,"nftAddress": MyERC721Address}],
    log: true,
  });
};

module.exports.tags = ["AuctionDeploy"];