// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./MyERC721.sol";
import "hardhat/console.sol";

// 拍卖合约
contract Auction is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable,IERC721Receiver {

    event createAuctionEvent(uint256 auctionId, address _nftAddress, uint256 _tokenId, AuctionInfo auctionInfo);

    event bidAuctionEvent(uint256 auctionId, address maxBidder, uint256 maxPrice, address tokenAddress);

    event endAuctionEvent(uint256 auctionId, AuctionInfo auction);

    struct AuctionInfo {
        // 拍卖ID
        uint256 auctionId;
        // 卖家地址
        address seller;
        // 持续时间
        uint256 duration;
        // 开始时间
        uint256 startTime;
        // 起拍价格
        uint256 startPrice;
        // 最高价格
        uint256 maxPrice;
        // 最高出价地址
        address maxBidder;
        // 拍卖状态
        bool status; // true: 进行中, false: 已结束
        // NFT合约地址
        address nftAddress;
        // NFT Token ID
        uint256 tokenId;
        // 参与竞价的资产类型 0x 地址表示eth，其他地址表示erc20
        address tokenAddress;
    }
    // 拍卖列表
    mapping(uint256 => AuctionInfo) public auctionMap;
    // 拍卖ID
    uint256 public auctionId;
    // 喂价合约地址
    mapping(address => AggregatorV3Interface) public priceFeeds;

    // 初始化合约时，禁用所有初始函数。这将阻止在部署后再次调用它们。
    // 注意：在构造函数中调用 _disableInitializers() 是必须的，否则合约将无法升级。
    constructor() {
        _disableInitializers();
    }

    // 添加：实现 UUPS 要求的 _authorizeUpgrade 函数
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function onERC721Received(
        address ,
        address ,
        uint256 ,
        bytes calldata
    ) external pure override returns (bytes4) {
        // 返回标准的接口标识符，告知转移方“已接收”
        return this.onERC721Received.selector;
    }
    // 初始化函数，在合约部署时调用一次
    function initialize(        
        uint256 _duration,
        uint256 _startPrice,
        address _nftAddress,
        uint256 _tokenId,
        address _owner
        ) external initializer {
        // 特殊处理 避免工厂合约  工厂 createAuction 创建新拍卖代理合约时，
        // 初始化指定的 owner（默认是「工厂部署账户」或「临时账户」，
        // 而非你的 deployer） 
        address finalOwner = (_owner == address(0)) ? msg.sender : _owner;
        __Ownable_init(finalOwner); 
        // 初始化 Ownable（设置管理员）
        __UUPSUpgradeable_init(); // 初始化 UUPS
        __ReentrancyGuard_init(); // 初始化 ReentrancyGuard
        // 初始化拍卖参数
        createAuction(_duration, _startPrice, _nftAddress, _tokenId);
    }

    // 设置喂价合约地址
    function setPriceFeeds(
        address _tokenAddress,
        address _feed
    ) external onlyOwner {
        priceFeeds[_tokenAddress] = AggregatorV3Interface(_feed);
    }

    // 获取喂价价格
    function getPrice(address _tokenAddress) public view returns (int256) {

        AggregatorV3Interface priceAggregtor = priceFeeds[_tokenAddress];
       console.log("------:", address(priceAggregtor));
        (, int256 answer, , , ) = priceAggregtor.latestRoundData();
        return answer;
    }

    // 创建拍卖合约(只有合约拥有者可以创建拍卖)
    function createAuction(
        uint256 _duration,
        uint256 _startPrice,
        address _nftAddress,
        uint256 _tokenId
    ) internal {
        // 持续时间必须大于0
        require(_duration > 0, "Duration must be greater than zero");
        // 起拍价格必须大于0
        require(_startPrice > 0, "Start price must be greater than zero");
        require(_nftAddress != address(0), "NFT Address cannot be zero");

        // 创建拍卖合约
        AuctionInfo memory newAuction = AuctionInfo(
            auctionId,
            msg.sender,
            _duration,
            block.timestamp,
            _startPrice,
            0,
            address(0),
            true,
            _nftAddress,
            _tokenId,
            address(0)
        );
        auctionMap[newAuction.auctionId] = newAuction;
        auctionId++; // auctionId 自增

        emit createAuctionEvent(newAuction.auctionId, _nftAddress, _tokenId, newAuction);
    }

    //买家出价
    function bid(
        uint256 _auctionId,
        uint256 _price,
        address _tokenAddress
    ) external payable nonReentrant {
        AuctionInfo storage auction = auctionMap[_auctionId];

        require(
            block.timestamp < auction.startTime + auction.duration,
            "Auction has ended"
        );
        require(auction.status == true, "Auction is not active");

        require(
            _price >= auction.startPrice,
            "Bid price must be higher than or equal to start price"
        );
        require(
            _price > auction.maxPrice,
            "Bid price must be higher than current max bid"
        );

        // // 检查喂价合约是否存在
        // require(
        //     address(priceFeeds[_tokenAddress]) != address(0),
        //     "Price feed not set for token"
        // );
        uint256 amount;
        // tokenAddress不为0，表示是ERC20代币出价
        if (_tokenAddress != address(0)) {
                        amount = _price;
                        // USDPrice = _price * uint256(getPrice(_tokenAddress));
            // 检查 ERC20 授权
            require(
                IERC20(_tokenAddress).allowance(msg.sender, address(this)) >=
                    _price,
                "Insufficient allowance"
            );
            // ERC20 出价，ETH 金额必须为0
            require(msg.value == 0, "ETH value must be zero for ERC20 bids");
            // 转账Erc20代币
            IERC20(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            );
        } else {
            // USDPrice = _price * uint256(getPrice(address(0)));
            // 转账ETH
            amount = msg.value;
        }

        // 退还上次出价者的金额
        if (auction.maxBidder != address(0)) {
            if (auction.tokenAddress != address(0)) {
                // 退还ERC20代币
                IERC20(auction.tokenAddress).transfer(
                    auction.maxBidder,
                    auction.maxPrice
                );
            } else {
                // 退还ETH
                (bool success, ) = payable(auction.maxBidder).call{
                    value: auction.maxPrice
                }("");
                require(success, "Refund failed");
            }
        }
        // 更新拍卖信息
        auction.maxPrice = amount;
        auction.maxBidder = msg.sender;
        auction.tokenAddress = _tokenAddress;
        emit bidAuctionEvent(_auctionId, msg.sender, amount, _tokenAddress );
    }

    // 结束拍卖
    function endAuction(uint256 _auctionId, address _factory) external onlyOwner nonReentrant {
        AuctionInfo storage auction = auctionMap[_auctionId];
        require(auction.maxBidder != address(0), "No bids placed for this auction");
        // 检查拍卖是否正在进行
        require(auction.status == true, "Auction already ended");
        // 检查拍卖时间是否已经结束
        require(
            block.timestamp >= auction.startTime + auction.duration,
            "Auction not yet ended"
        );
        // 设置拍卖状态为结束
        auction.status = false;
        // 转移NFT所有权给最高出价者
        MyERC721(auction.nftAddress).transferFrom(
            address(this),
            auction.maxBidder,
            auction.tokenId
        );
        uint256 maxPrice = auction.maxPrice;
        uint256 fee;
        // 计算转移手续费到平台
        if(_factory != address(0)){
           (bool success, bytes memory data) = _factory.call(abi.encodeWithSignature("calculatePrice(uint256)", maxPrice));
           require(success, "Failed to call calculatePrice");
           fee = abi.decode(data, (uint256));
            maxPrice = maxPrice - fee;
        }
        // 转移金额到卖家
        if (auction.tokenAddress != address(0)) {
            IERC20(auction.tokenAddress).transfer(
                auction.seller,
                maxPrice
            );
            IERC20(auction.tokenAddress).transfer(
                auction.seller,
                fee
            );
        } else {
            payable(auction.seller).transfer(maxPrice);
            payable(_factory).transfer(fee);
        }


        emit endAuctionEvent(_auctionId, auction);
    }

    //  计算出价的 USD 价值  分ETH和USDC两种代币的喂价合约计算USD价值
    function _calculateBidUSDValue(
        address _payToken,
        uint256 _amount
    ) internal view virtual returns (uint256) {
        AggregatorV3Interface feed = priceFeeds[_payToken];
        require(address(feed) != address(0), "Price feed not set for payToken");
        
        (, int256 priceRaw, , , ) = feed.latestRoundData();
        require(priceRaw > 0, "Invalid price from feed");
        uint256 price = uint256(priceRaw);
        uint256 feedDecimal = feed.decimals();
        if (address(0) == _payToken) {
            return price * _amount / (10**(12 + feedDecimal));  // ETH 10**(18 + feedDecimal - 6) = 10**(12 + feedDecimal)
        } else {
            return price * _amount / (10**(feedDecimal));  // USDC 10**(6 + feedDecimal - 6) = 10**feedDecimal
        }
    }

    // 计算当前拍卖最高出价的 USD 价值
    function _getHightestUSDValue() internal view virtual returns (uint256) {
        uint256 _auctionId = auctionId-1;
        AuctionInfo memory auctionInfo =  auctionMap[_auctionId];
        AggregatorV3Interface feed = priceFeeds[auctionInfo.tokenAddress];
        require(address(feed) != address(0), "Price feed not set for payToken");
        (, int256 priceRaw, , , ) = feed.latestRoundData();
        require(priceRaw > 0, "Invalid price from feed");
        uint256 price = uint256(priceRaw); // 获取价格预言机喂价
        uint256 feedDecimal = feed.decimals(); // 获取价格预言机小数位数

        // 获取当前最高出价，默认为起拍价格，如果有人出价，则最高出价为最高出价
        uint256 hightestAmount = auctionInfo.startPrice;
        if (auctionInfo.maxBidder != address(0)) {
            hightestAmount = auctionInfo.maxPrice;
        }
        if (address(0) == auctionInfo.tokenAddress) {
            return price * hightestAmount / (10**(12 + feedDecimal));  // ETH 10**(18 + feedDecimal - 6) = 10**(12 + feedDecimal)
        } else {
            return price * hightestAmount / (10**(feedDecimal));  // USDC 10**(6 + feedDecimal - 6) = 10**feedDecimal
        }
    }
}