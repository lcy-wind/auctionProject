const { ethers, upgrades } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { save } = deployments;
  const [deployer, user1, user2] = await ethers.getSigners();

  // 1. 部署 ERC721 合约
  const MyERC721 = await ethers.getContractFactory("MyERC721");
  const MyERC721Contract = await MyERC721.deploy("LCYNFT", "LCYNFT");
  await MyERC721Contract.waitForDeployment();
  const MyERC721Address = await MyERC721Contract.getAddress();
  // 2. 铸造 NFT 并获取 tokenId
  const mintTx = await MyERC721Contract.connect(deployer).mint(deployer.address, "https://ipfs.io/ipfs/bafkreia6zbmkqbhdsk7hqdn4lf25uhqjuxw7bzqdze7ompmjopfg6jlmzm");
  await mintTx.wait();

  console.log("NFT 初始化创建成功", (await MyERC721Contract.tokenCountId()) - 1n);

  //3. 保存基本信息
  await save("MyERC721", {
    address: MyERC721Address,
    abi: MyERC721.interface.formatJson(),
    args: [],
    log: true,
  });
};

module.exports.tags = ["MyERC721Deploy"];