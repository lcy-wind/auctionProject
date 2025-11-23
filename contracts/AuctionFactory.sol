// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./Auction.sol";

import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AuctionFactory is Initializable, UUPSUpgradeable, OwnableUpgradeable{
    address[] public auctions;

    mapping (uint256 tokenId => Auction) public auctionMap;

    event AuctionCreated(address indexed auctionAddress,uint256 tokenId);

    address newAuctionProxyAddress;

    // 手续费接受地址
    address public priceFeedsAddress;
    // 手续费比例
    uint256 public priceFeesRate;

    function initialize(
        address _newAuctionProxyAddress
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(
            _newAuctionProxyAddress != address(0),
            "Invalid nftAuctionImplementation"
        );
        newAuctionProxyAddress = _newAuctionProxyAddress;
    }

    // Create a new auction
    function createAuction(
        uint256 duration,
        uint256 startPrice,
        address _nftAddress,
        uint256 tokenId
    ) external onlyOwner returns (address) {

    // 获取拍卖的代理地址
      ERC1967Proxy proxy =  new ERC1967Proxy(newAuctionProxyAddress, "");
      address auctionAddress = address(proxy);
      Auction auction = Auction(payable(auctionAddress));
        auction.initialize(
            duration,
            startPrice,
            _nftAddress,
            tokenId,
            msg.sender
        );
        auctions.push(auctionAddress);
        auctionMap[tokenId] = auction;
        MyERC721 nftMyERC721 = MyERC721(_nftAddress);
        require(nftMyERC721.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        require(nftMyERC721.getApproved(tokenId) == address(this), "NFT not approved");
        // 转移NFT所有权
        nftMyERC721.transferFrom(
            msg.sender,
            auctionAddress,
            tokenId
        );
        emit AuctionCreated(auctionAddress, tokenId);
        console.log("CF auctionAddress=", auctionAddress, "tokenId=", tokenId); // 调试

        return address(auction);
    }

    function getAuctions() external view returns (address[] memory) {
        return auctions;
    }

    function getAuction(uint256 tokenId) external view returns (address) {
        require(tokenId < auctions.length, "tokenId out of bounds");
        return auctions[tokenId];
    }

    // 设置手续费接收地址和比例
    function setPriceFeedsAddressAndPriceFeesRate(address _newPriceFeedsAddress, uint256 _newPriceFeesRate) external {
        priceFeedsAddress = _newPriceFeedsAddress;
        priceFeesRate =  _newPriceFeesRate;
    }

    // 计算手续费金额
    function calculatePrice(uint256 price) external view returns (uint256) {
        return price * (priceFeesRate / 100);
    }


    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}