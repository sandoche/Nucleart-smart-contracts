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

contract Nucleart is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    AccessControl,
    EIP712,
    ERC721Royalty
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private constant SIGNING_DOMAIN = "Nucleart-Voucher";
    string private constant SIGNATURE_VERSION = "1";

    // Max supply based on the number of Nuclear Warhead available in January 2021, source: https://www.statista.com/statistics/264435/number-of-nuclear-warheads-worldwide/
    uint256 public constant MAX_SUPPLY = 13080;
    uint8 public constant MAX_LEVEL = 5;

    mapping(bytes32 => uint8) private _tokenUriHashToLevel;

    constructor(address payable minter)
        ERC721("Nucleart", "NART")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, minter);
        _setDefaultRoyalty(msg.sender, 1000);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        /// @notice The id of the token to be redeemed. Must be unique - if another token with this ID already exists, the redeem function will revert.
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string uri;
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

        // make sure the level is not above the limit then upgrade level
        require(
            getLevelFromUri(voucher.uri) < MAX_LEVEL,
            "This NFT reached its maximum level of radioactivity"
        );
        _setOrUpgradeVersion(voucher.uri);

        // first assign the token to the signer, to establish provenance on-chain
        _lazyMint(signer, voucher.tokenId, voucher.uri);

        // transfer the token to the redeemer
        _transfer(signer, redeemer, voucher.tokenId);

        return voucher.tokenId;
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
                        keccak256("NFTVoucher(uint256 tokenId,string uri)"),
                        voucher.tokenId,
                        keccak256(bytes(voucher.uri))
                    )
                )
            );
    }

    function _lazyMint(
        address to,
        uint256 tokenId,
        string memory uri
    ) internal {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function safeMint(
        address to,
        uint256 tokenId,
        string memory uri
    ) public onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function changeRoyaltyReceiver(address newRoyaltyReceiver)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(newRoyaltyReceiver, 1000);
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

    function getCurrentPrice() public view returns (uint256) {
        uint256 price;

        if (totalSupply() <= 80) {
            price = 0;
        } else if (totalSupply() <= 320) {
            price = 1;
        } else if (totalSupply() <= 1280) {
            price = 10;
        } else if (totalSupply() <= 5120) {
            price = 100;
        } else if (totalSupply() <= 13000) {
            price = 1000;
        } else if (totalSupply() <= 13070) {
            price = 10000;
        } else {
            price = 100000;
        }

        return price * 10**18;
    }

    function _uriHash(string calldata uri) internal pure returns (bytes32) {
        return keccak256(bytes(uri));
    }

    function _setOrUpgradeVersion(string calldata uri) internal {
        bytes32 _uriHashed = _uriHash(uri);
        uint8 _level = getLevelFromUri(uri);
        _level++;
        _tokenUriHashToLevel[_uriHashed] = _level;
    }

    function getLevelFromUri(string calldata uri)
        public
        view
        virtual
        returns (uint8)
    {
        bytes32 _uriHashed = _uriHash(uri);
        uint8 _level = _tokenUriHashToLevel[_uriHashed];
        return _level;
    }
}
