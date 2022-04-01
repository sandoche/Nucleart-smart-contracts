// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

contract Nucleart is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    AccessControl,
    EIP712,
    ERC721Royalty
{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private constant SIGNING_DOMAIN = "Nucleart-Voucher";
    string private constant SIGNATURE_VERSION = "1";
    uint8 public constant MAX_LEVEL = 5;

    // Max supply based on the number of Nuclear Warhead available in January 2021, source: https://www.statista.com/statistics/264435/number-of-nuclear-warheads-worldwide/
    uint256 public constant MAX_SUPPLY = 13080;

    mapping(bytes32 => NFT) private _childNftHashToNftParent;
    mapping(bytes32 => bool) private _nftHasBeenNuked;

    constructor(address payable minter)
        ERC721("Nucleart", "NART")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, minter);
        _setDefaultRoyalty(msg.sender, 1000);
    }

    struct NFT {
        uint256 chainId;
        address contractAddress;
        uint256 tokenId;
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice The chain id of the parent NFT.
        uint256 parentNFTChainId;
        /// @notice The contract address of the parent NFT.
        address parentNFTcontractAddress;
        /// @notice The token id of the parent NFT.
        uint256 parentNFTtokenId;
        /// @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the MINTER_ROLE.
        bytes signature;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function redeem(address redeemer, NFTVoucher calldata voucher)
        public
        payable
        returns (uint256)
    {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // make sure that the redeemer is paying enough to cover the buyer's cost
        require(msg.value >= getCurrentPrice(), "Insufficient funds to redeem");

        // make sure that we didn't overpass the max supply
        require(
            totalSupply() < MAX_SUPPLY,
            "All the nucleart warheads have been used"
        );

        // get the parent NFT
        NFT memory parentNFT = _constructNft(
            voucher.parentNFTChainId,
            voucher.parentNFTcontractAddress,
            voucher.parentNFTtokenId
        );

        // make sure that this parent NFT is not already minted
        require(
            hasBeenNuked(parentNFT) == false,
            "This NFT has already been nuked"
        );

        // make sure the level is not above the limit then upgrade level
        require(
            getLevel(parentNFT) < MAX_LEVEL,
            "This NFT reached its maximum level of radioactivity"
        );

        // mint and send the NFT
        uint256 _tokenId = _lazyMint(signer, voucher.uri);
        _transfer(signer, redeemer, _tokenId);

        // get the children NFT
        NFT memory childNFT = _constructNft(
            getChainID(),
            address(this),
            _tokenId
        );

        // Save relation and mark NFT as nuked
        _saveRelation(childNFT, parentNFT);
        _markNFTAsNuked(parentNFT);

        return _tokenId;
    }

    /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher An NFTVoucher describing an unminted NFT.
    function _verify(NFTVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    function _hash(NFTVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFTVoucher(string uri,uint256 parentNFTChainId,address parentNFTcontractAddress,uint256 parentNFTtokenId)"
                        ),
                        keccak256(bytes(voucher.uri)),
                        voucher.parentNFTChainId,
                        voucher.parentNFTcontractAddress,
                        voucher.parentNFTtokenId
                    )
                )
            );
    }

    function _lazyMint(address to, string memory uri)
        internal
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    function changeRoyaltyReceiver(address newRoyaltyReceiver)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(newRoyaltyReceiver, 1000);
    }

    function getCurrentPrice() public view returns (uint256) {
        uint256 price;

        if (totalSupply() < 80) {
            price = 0;
        } else if (totalSupply() < 320) {
            price = 1;
        } else if (totalSupply() < 1280) {
            price = 10;
        } else if (totalSupply() < 5120) {
            price = 100;
        } else if (totalSupply() < 13000) {
            price = 1000;
        } else if (totalSupply() < 13070) {
            price = 10000;
        } else {
            price = 100000;
        }

        return price * 10**18;
    }

    function getLevel(NFT memory nft) public view virtual returns (uint8) {
        if (hasBeenNuked(nft)) {
            uint8 level = 1;

            NFT memory currentChild = nft;

            while (getParentNft(currentChild).chainId > 0) {
                level++;
                currentChild = getParentNft(currentChild);
            }

            return level;
        } else {
            return 0;
        }
    }

    function _saveRelation(NFT memory childNft, NFT memory parentNft) internal {
        bytes32 _childNftHash = _nftHash(childNft);
        _childNftHashToNftParent[_childNftHash] = parentNft;
    }

    function _markNFTAsNuked(NFT memory nft) internal {
        _nftHasBeenNuked[_nftHash(nft)] = true;
    }

    function _constructNft(
        uint256 chainId,
        address contractAddress,
        uint256 tokenId
    ) internal pure returns (NFT memory) {
        NFT memory _nft = NFT(chainId, contractAddress, tokenId);
        return _nft;
    }

    function _nftHash(NFT memory nft) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(nft.chainId, nft.contractAddress, nft.tokenId)
            );
    }

    function getParentNft(NFT memory childNft)
        public
        view
        returns (NFT memory)
    {
        bytes32 _childNftHash = _nftHash(childNft);
        return _childNftHashToNftParent[_childNftHash];
    }

    function hasBeenNuked(NFT memory nft) internal view returns (bool) {
        return _nftHasBeenNuked[_nftHash(nft)];
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() public view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage, ERC721Royalty)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
