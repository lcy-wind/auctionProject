

// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import "./Auction.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract AuctionV2 is Auction {

    // 升级测试 
    function upTest() public pure returns (string memory) {
        return "upTest success";
    }

    function initializeV2() external initializer {
                // 调用 Auction 继承的所有父合约初始化函数
        __Ownable_init(msg.sender);           // OwnableUpgradeable 初始化
        __ReentrancyGuard_init();   // ReentrancyGuardUpgradeable 初始化
        __UUPSUpgradeable_init();   // UUPSUpgradeable 初始化
    }
}
