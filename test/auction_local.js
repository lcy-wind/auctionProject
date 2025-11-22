const { ethers, deployments } = require("hardhat");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 本地测试用例
describe("Test NFT721 createAuction", function () {
  let myERC721;
  let myERC20;
  let auction;
  let auctionV2;
  let factory;
  let deployer, user1, user2;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    // 1. 部署核心合约
    await deployments.fixture(["MyERC721Deploy", "AuctionDeploy", "AuctionV2Deploy", "AuctionFactoryDeploy"]);
    
    // 2. 获取核心合约实例
    const MyERC721Info = await deployments.get("MyERC721")
    myERC721 = await ethers.getContractAt("MyERC721", MyERC721Info.address);
    
    const MyAuctionInfo = await deployments.get("MyAuctionProxy")
    auction = await ethers.getContractAt("Auction", MyAuctionInfo.address);
    
    const MyAuctionInfoV2 = await deployments.get("MyAuctionV2Proxy")
    auctionV2 = await ethers.getContractAt("AuctionV2", MyAuctionInfoV2.address);
    
    const AuctionFactoryInfo = await deployments.get("AuctionFactory")
    factory = await ethers.getContractAt("AuctionFactory", AuctionFactoryInfo.address);

    // 3. 部署ERC20代币
    const MyERC20Deploy = await ethers.getContractFactory("MyERC20");
    myERC20 = await MyERC20Deploy.deploy();
    await myERC20.waitForDeployment();
    await myERC20.mint(deployer.address, ethers.parseEther("20"));
    console.log("ERC20 代币部署成功", await myERC20.balanceOf(deployer.address))

  })

  it("zyi  test", async function () {
    const oldTokenId = (await myERC721.tokenCountId()) - 1n
    console.log("orgin in address ::", await myERC721.ownerOf(oldTokenId))
    // 转移NFT到拍卖合约
    await myERC721.transferFrom(deployer.address, await auction.getAddress(), oldTokenId);
    console.log("now in address ::", await myERC721.ownerOf(oldTokenId))

    // 验证合约升级
    console.log("升级后 新增的函数:", await auctionV2.upTest());
    const ERC721Address = await myERC721.getAddress();
    console.log("ERC721Address ::", ERC721Address);

    // 重新Mint NFT并授权工厂
    const nftTx = await myERC721.mint(deployer.address, "https://ipfs.io/ipfs/bafkreia6zbmkqbhdsk7hqdn4lf25uhqjuxw7bzqdze7ompmjopfg6jlmzm");
    await nftTx.wait();
    const newTokenId = (await myERC721.tokenCountId()) - 1n
    await myERC721.approve(factory.getAddress(), newTokenId);
    console.log("new tokenId", newTokenId);
    console.log("new tokenId 属于 ", await myERC721.ownerOf(newTokenId));

    // 工厂创建拍卖
    await factory.createAuction(
      10n, 
      ethers.parseEther("0.001"), 
      ERC721Address,
      newTokenId
    )
    console.log("new tokenId 属于 ", await myERC721.ownerOf(newTokenId));
    // 获取拍卖实例（修正：用newTokenId而非固定1）
    const auctionAddress = await factory.auctionMap(newTokenId);
    const auctionInstance = await auction.attach(auctionAddress);
    const auctionMapValue = await auctionInstance.auctionMap(0);
    console.log("查看创建的拍卖信息", auctionMapValue);

    await myERC20.approve(auctionAddress, ethers.parseEther("0.003"));

    // ETH出价
    await auctionInstance.bid(
      0n,
      ethers.parseEther("0.002"),
      ethers.ZeroAddress,
      { value: ethers.parseEther("0.002") }
    );
    // ERC20出价
    await auctionInstance.bid(
      0n,
      ethers.parseEther("0.003"),
      await myERC20.getAddress(),
      { value: 0 }
    );
    console.log("出价后拍卖信息:", await auctionInstance.auctionMap(0));
    console.log("now in address ::", await myERC721.ownerOf(newTokenId))
    await sleep(15000);
    // 结束拍卖
    await auctionInstance.endAuction(0n);
    // 查看721代币归属
    console.log("now in address ::", await myERC721.ownerOf(newTokenId))

  })
});