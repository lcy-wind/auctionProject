// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 

contract MyERC721 is ERC721URIStorage, Ownable {

    // 代币计数器，用于生成唯一的代币ID
    uint256 public tokenCountId;

    // 初始化代币合约的构造函数
    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) Ownable(msg.sender) {
       tokenCountId = 0;
    }

    // 铸造代币函数
    function mint(address _to, string memory _tokenUrl) external onlyOwner returns (uint256) {
        uint256 tokenId = tokenCountId;
        _safeMint(_to, tokenCountId);
        _setTokenURI(tokenCountId, _tokenUrl);
        tokenCountId++;
        return tokenId;
    }
}