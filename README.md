# Auction Project 拍卖项目文档

## 📋 项目概述

这是一个基于Hardhat构建的NFT拍卖平台项目，采用了现代化的智能合约架构设计，支持ETH和ERC20代币竞价、合约升级、价格预言机集成等功能。

## 🏗️ 技术架构

### 技术栈
- **开发框架**: Hardhat
- **智能合约**: Solidity 0.8.x
- **合约库**: OpenZeppelin Contracts
- **价格预言机**: Chainlink
- **测试网络**: Sepolia Testnet

### 合约依赖
```json
{
  "@nomicfoundation/hardhat-toolbox": "^6.1.0",
  "@openzeppelin/contracts": "^5.4.0",
  "@openzeppelin/contracts-upgradeable": "^5.4.0",
  "@chainlink/contracts": "^1.5.0",
  "hardhat-deploy": "^1.0.4"
}
```

## 📂 项目结构

```
auctionProject/
├── contracts/                 # 智能合约目录
│   ├── Auction.sol           # 主拍卖合约（可升级）
│   ├── AuctionV2.sol         # 拍卖合约升级版本
│   ├── AuctionFactory.sol    # 拍卖合约工厂
│   ├── MyERC20.sol          # 模拟USDC代币合约
│   └── MyERC721.sol         # NFT合约
├── deploy/                   # 部署脚本
│   ├── 01_deploy_MyERC721.js
│   ├── 02_deploy_Auction.js
│   ├── 03_deploy_upAuction.js
│   └── 04_deploy_AuctionFactory.js
├── test/                    # 测试用例
│   ├── auction_local.js     # 本地测试
│   ├── auction_sepolia.js   # Sepolia网络测试
├── hardhat.config.js        # Hardhat配置
└── package.json            # 项目依赖
```

## 🔧 核心功能

### 1. NFT拍卖系统
- **支持资产**: ERC721 NFTs
- **竞价方式**: ETH 和 ERC20代币（USDC）
- **拍卖机制**: 英式拍卖，价高者得
- **资金处理**: 自动退款和转账

### 2. 可升级合约架构
- 使用UUPS升级模式
- 支持合约逻辑升级
- 保持状态数据不变

### 3. 工厂模式
- 动态创建拍卖合约
- 统一管理所有拍卖实例
- 简化用户操作流程

### 4. 价格预言机集成
- Chainlink ETH/USD喂价
- Chainlink USDC/USD喂价
- 实时计算竞价美元价值

## 📝 合约详情

### Auction.sol - 主拍卖合约
```solidity
struct AuctionInfo {
    uint256 auctionId;      // 拍卖ID
    address seller;         // 卖家地址
    uint256 duration;       // 持续时间
    uint256 startTime;      // 开始时间
    uint256 startPrice;     // 起拍价格
    uint256 maxPrice;       // 最高价格
    address maxBidder;      // 最高出价者
    bool status;           // 拍卖状态
    address nftAddress;    // NFT合约地址
    uint256 tokenId;       // NFT Token ID
    address tokenAddress;  // 竞价代币地址
}
```

**主要功能**:
- `createAuction()`: 创建新拍卖
- `bid()`: 参与竞拍
- `endAuction()`: 结束拍卖
- `setPriceFeeds()`: 设置价格预言机

## 🧪 测试用例

### 本地测试覆盖
- ✅ NFT铸造和所有权转移
- ✅ 拍卖创建和竞价
- ✅ ETH和ERC20竞价测试
- ✅ 合约升级验证
- ✅ 工厂模式测试

### Sepolia网络测试
- ✅ 链上合约部署
- ✅ 价格预言机集成
- ✅ 跨合约交互
- ✅ Gas费用优化

## ⚙️ 配置说明

### Hardhat配置 (hardhat.config.js)
```javascript
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.ACCOUNT_1, process.env.ACCOUNT_2]
    }
  }
};
```

### 环境变量配置
```env
ACCOUNT_1=你的私钥1
ACCOUNT_2=你的私钥2
INFURA_API_KEY=你的Infura API密钥
```

## 🔄 合约升级流程

### 升级到AuctionV2
1. 部署新的实现合约
2. 通过upgradeProxy升级
3. 验证新功能正常

```javascript
const auctionV2 = await upgrades.upgradeProxy(
  proxyAddress, 
  AuctionV2, 
  { unsafeAllow: ['constructor'] }
);
```

## 📊 价格预言机配置

### Chainlink喂价地址
- **ETH/USD**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- **USDC/USD**: `0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E`

### 价格计算

```solidity
function _calculateBidUSDValue(
    address _payToken,
    uint256 _amount
) internal view returns (uint256) {
    // 根据代币类型计算美元价值
}
### 项目准备
执行安装脚本
npm install @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
npm install @openzeppelin/contracts-upgradeable
npm install @chainlink/contracts
npm install hardhat-deploy
npm install dotenv

### 编译合约
运行本地测试用例  
npx hardhat test ./test/auction_local.js
执行流程
1、部署 ERC721 合约
2、部署 Auction 合约
3、升级 Auction 合约
4、部署 AuctionFactory 合约
5、测试整个流程

运行sepolia网络测试
npx hardhat run .\test\auction_sepolia.js --network sepolia
执行流程
1、部署 ERC721 合约
2、部署 Auction 合约
3、升级 Auction 合约
4、部署 AuctionFactory 合约
5、测试整个流程

