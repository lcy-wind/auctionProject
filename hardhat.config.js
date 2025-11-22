require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config()

// 🔴 新增：私钥合法性校验（提前排查错误）
const PRIVATE_KEY = process.env.ACCOUNT_1;
if (!PRIVATE_KEY) {
  throw new Error("❌ .env文件中未配置ACCOUNT_1私钥");
}
// 检查私钥长度：0x + 64位 = 66字符，或纯64位（无0x）
const keyWithout0x = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY.slice(2) : PRIVATE_KEY;
if (keyWithout0x.length !== 64) {
  throw new Error(`❌ 私钥长度错误！当前长度：${keyWithout0x.length}，需64位十六进制字符`);
}


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  namedAccounts: {
    deployer: 0,
    user1: 1,
    user2: 2,
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.ACCOUNT_1,process.env.ACCOUNT_2]
    }
  }
};
