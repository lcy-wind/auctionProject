const { ethers, upgrades } = require("hardhat");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 全局变量初始化 
let myERC721Addr = "0x1a505568C0116D48d8141f78262abE2ABd4cB7ca";
let auctionV2Addr = "0xED8291803440A091C7d698e6A8421DAe8f0A0d04";
let factoryAddr = "0xB1489273Db6d6dD3Aff75C0880348482F4d46529";
let myERC20Addr = "0x15292bAea2b3e76578d93Ea09cC0CA11886eB95D";
let deployer, user1, user2;

// ETH / USD  以太坊=》美元测试喂价地址
// 0x694AA1769357215DE4FAC081bf1f309aDC325306
// USDC / USD ERC20=》美元测试喂价地址
// 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E
let ETHUSD = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
let USDCUSD = "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E";



async function main() {
  [deployer, user1, user2] = await ethers.getSigners();


  // 部署所有节点
  // await deployContract(deployer, user1);

  // 通过链上地址 获取各个合同实例
  const myERC721Contract = await ethers.getContractFactory("MyERC721");
  let myERC721 = myERC721Contract.attach(myERC721Addr);
  const oldTokenId = (await myERC721.tokenCountId()) - 1n
  console.log("orgin in address ::", await myERC721.ownerOf(oldTokenId));

  const auctionFactoryContract = await ethers.getContractFactory("AuctionFactory");
  let factory = auctionFactoryContract.attach(factoryAddr);

  await myERC721.mint(deployer.address, "https://ipfs.io/ipfs/bafkreia6zbmkqbhdsk7hqdn4lf25uhqjuxw7bzqdze7ompmjopfg6jlmzm");

  const newTokenId = (await myERC721.tokenCountId()) - 1n
  console.log("new tokenId ::", newTokenId);
  console.log("创建拍卖前  new tokenId 属于 ", await myERC721.ownerOf(newTokenId));
  //给工厂合约授权
  let tx = await myERC721.approve(factoryAddr, newTokenId);
  await tx.wait(3);
  // 工厂合约创建拍卖
  await factory.createAuction(
    200n,
    ethers.parseEther("0.001"),
    myERC721Addr,
    newTokenId
  )
  await sleep(20000);
  console.log("创建拍卖后 new tokenId 属于 ", await myERC721.ownerOf(newTokenId));
  const AuctionV2 = await ethers.getContractFactory("AuctionV2");
  // 设置喂价
    const auctionAddress = await factory.auctionMap(newTokenId);
     const code = await ethers.provider.getCode(auctionAddress);
    if (code === "0x") {
      throw new Error(`拍卖合约 ${auctionAddress} 未部署！`);
    }
     console.log("✅ 拍卖合约已部署，代码长度：", code.length);

    const auctionInstance = await AuctionV2.attach(auctionAddress);
    let setTx1 = await auctionInstance.setPriceFeeds(ethers.ZeroAddress, ETHUSD, { gasLimit: 100000 });
    await setTx1.wait(2); // 等2个区块确认
    console.log("✅ ETH喂价设置成功");
  // 设置USDC喂价（可选）
  let setTx2 = await auctionInstance.setPriceFeeds(user1.address, USDCUSD, { gasLimit: 100000 });
  await setTx2.wait(1);
  console.log("✅ USDC喂价设置成功");

  // ========== 关键3：验证喂价地址是否真的设置成功 ==========
  const ethFeedAddr = await auctionInstance.priceFeeds(ethers.ZeroAddress);
  console.log("✅ 链上ETH喂价地址：", ethFeedAddr);
  if (ethFeedAddr === ethers.ZeroAddress) {
    throw new Error("❌ ETH喂价地址设置失败！");
  }
  // ========== 关键4：调用getPrice（显式指定Gas，捕获原始数据） ==========
  try {
    // 显式指定Gas，避免Sepolia Gas不足
    const ethPrice = await auctionInstance.getPrice(ethers.ZeroAddress, { gasLimit: 200000 });
    console.log("✅ ETH 喂价价格（原始值）：", ethPrice.toString());
    // 格式化（Chainlink ETH/USD喂价是8位小数）
    console.log("✅ ETH 喂价价格（美元）：", ethers.formatUnits(ethPrice, 8));
  } catch (e) {
    console.error("❌ 调用getPrice失败：", e.message);
    // 兜底：手动调用排查
    const rawResult = await ethers.provider.call({
      to: auctionAddress,
      data: auctionInstance.interface.encodeFunctionData("getPrice", [ethers.ZeroAddress])
    });
    console.error("✅ 原始返回数据：", rawResult);
  }

  const myERC20Contract = await ethers.getContractFactory("MyERC20");
  console.log("ERC20合约地址：", myERC20Addr);
  let myERC20 = myERC20Contract.attach(myERC20Addr);
    
  await sleep(5000);
    const newAuctionId = (await auctionInstance.auctionId()) - 1n
  let tx20 = await myERC20.approve(auctionAddress, ethers.parseEther("0.003"));
  await tx20.wait(3);
    // ETH出价
    await auctionInstance.bid(
      newAuctionId,
      ethers.parseEther("0.002"),
      ethers.ZeroAddress
    );
    await sleep(5000);
    // ERC20出价
    await auctionInstance.bid(
      newAuctionId,
      ethers.parseEther("0.003"),
      await myERC20.getAddress()
    );
    await sleep(5000);
    console.log("出价后拍卖信息:", await auctionInstance.auctionMap(0));
    console.log("now in address ::", await myERC721.ownerOf(newTokenId))
    await sleep(200000);

    // 结束拍卖
    await auctionInstance.endAuction(newAuctionId);
    await sleep(10000);
    // 查看721代币归属
    console.log("now in address ::", await myERC721.ownerOf(newTokenId))

}

async function deployContract(deployer, user1) {
  console.log("🚀 开始部署到 Sepolia 测试网...");
  console.log("🚀 部署者地址：", deployer.address);
  console.log("🚀 用户1地址：", user1.address);

  // ========== 1. 部署MyERC721合约并铸造NFT ==========
  const MyERC721 = await ethers.getContractFactory("MyERC721");
  const MyERC721Contract = await MyERC721.deploy("LCYNFT01", "LCYNFT01");
  await MyERC721Contract.waitForDeployment();
  const MyERC721Address = await MyERC721Contract.getAddress();
  // 修正：将部署的合约实例赋值给全局myERC721变量
  // myERC721 = MyERC721Contract; 

  // 铸造NFT并获取tokenId
  const mintTx = await MyERC721Contract.mint(
    deployer.address,
    "https://ipfs.io/ipfs/bafkreia6zbmkqbhdsk7hqdn4lf25uhqjuxw7bzqdze7ompmjopfg6jlmzm"
  );
  await mintTx.wait();

  const tokenCount = await MyERC721Contract.tokenCountId();
  const tokenId = tokenCount - 1n;
  console.log("✅ NFT铸造成功，TokenId：", tokenId);
  console.log("✅ MyERC721合约地址：", MyERC721Address);

  // ========== 2. 部署Auction代理合约（禁用自动初始化） ==========
  const MyAuction = await ethers.getContractFactory("Auction");
  const auctionProxy = await upgrades.deployProxy(
    MyAuction,
    [],
    {
      // 仅当合约构造函数有状态修改时才需要，否则移除
      unsafeAllow: ['constructor'],
      initializer: false
    }
  );
  await auctionProxy.waitForDeployment();
  const auctionProxyAddress = await auctionProxy.getAddress();
  console.log("✅ Auction代理合约地址：", auctionProxyAddress);

  // ========== 3. 手动初始化Auction合约（修正参数类型） ==========
  // 关键修正：最后一个参数传deployer.address（地址类型），而非Signer对象
  await auctionProxy.initialize(
    300n, // duration（拍卖时长，单位秒，根据实际需求调整）
    ethers.parseEther("0.01"), // startPrice（0.01 ETH，替换原硬编码数值，更易读）
    MyERC721Address, // NFT合约地址
    tokenId, // 拍卖的NFT tokenId
    deployer.address // 修正：传地址而非Signer对象
  );
  console.log("✅ Auction合约初始化成功");

  // 获取Auction V1实现合约地址
  const auctionV1ImplAddress = await upgrades.erc1967.getImplementationAddress(auctionProxyAddress);
  console.log("✅ Auction V1实现合约地址：", auctionV1ImplAddress);

  await sleep(10000); // 等待区块确认，以防太快导致区块未更新

  // ========== 4. 升级Auction到V2 ==========
  const AuctionV2 = await ethers.getContractFactory("AuctionV2");
  const auctionV2Proxy = await upgrades.upgradeProxy(auctionProxyAddress, AuctionV2,
    {
      unsafeAllow: ['constructor'] // 关键：必须添加，绕过构造函数校验
    });
  await auctionV2Proxy.waitForDeployment();

  console.log("✅ Auction合约升级到V2成功", await auctionV2Proxy.getAddress());

  // 获取Auction V2实现合约地址
  const auctionV2ImplAddress = await upgrades.erc1967.getImplementationAddress(auctionProxyAddress);
  console.log("✅ Auction V2实现合约地址：", auctionV2ImplAddress);

  // ========== 5. 部署AuctionFactory工厂合约（修正依赖的实现地址） ==========
  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  // 修正：工厂合约初始化传V2实现地址（而非V1）
  const auctionFactoryProxy = await upgrades.deployProxy(
    AuctionFactory,
    [auctionV2ImplAddress], // 传V2实现地址
    { initializer: "initialize" }
  );
  await auctionFactoryProxy.waitForDeployment();
  const factoryAddress = await auctionFactoryProxy.getAddress();
  console.log("✅ AuctionFactory代理合约地址：", factoryAddress);

  const MyERC20 = await ethers.getContractFactory("MyERC20");
  const MyERC20Contract = await MyERC20.deploy();
  await MyERC20Contract.waitForDeployment();
  await MyERC20Contract.mint(deployer.address, ethers.parseEther("100"));
  const MyERC20Address = await MyERC20Contract.getAddress();
  console.log("✅ MyERC20合约地址：", MyERC20Address);

  // 地址赋值给全局变量，以便后续使用
  myERC721Addr = MyERC721Address; 
  auctionV2Addr = await auctionV2Proxy.getAddress();
  factoryAddr = factoryAddress;
  myERC20Addr = MyERC20Address;
  
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败：", error);
    process.exit(1);
  });