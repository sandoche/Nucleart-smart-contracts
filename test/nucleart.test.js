const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createArrayOfRandomVouchers, generatePricingTable } = require("../utils/test-helper")
const { LazyMinter } = require('../utils/lazy-minter.js')

async function deploy() {
  const [minter, redeemer, _] = await ethers.getSigners()

  let factory = await ethers.getContractFactory("Nucleart", minter)
  const contract = await factory.deploy(minter.address)

  // the redeemerContract is an instance of the contract that's wired up to the redeemer's signing key
  const redeemerFactory = factory.connect(redeemer)
  const redeemerContract = redeemerFactory.attach(contract.address)

  return {
    minter,
    redeemer,
    contract,
    redeemerContract,
  }
}

describe("Nucleart - Signature", function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it("Should deploy", async function () {
    const signers = await ethers.getSigners();
    const minter = signers[0].address;

    const NucleartFactory = await ethers.getContractFactory("Nucleart");
    const nucleart = await NucleartFactory.deploy(minter);
    await nucleart.deployed();
  });

  it("Should redeem an NFT from a signed voucher", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      tokenId: 1,
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000000",
      parentNFTtokenId: 1,
      childNFTChainId: 1,
      childNFTcontractAddress: "0x0000000000000000000000000000000000000000",
      childNFTtokenId: 1,
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId);
  });


  // it("Should fail to redeem an NFT that's already been claimed", async function () {
  //   const lazyMinter = new LazyMinter({ contract, signer: minter })
  //   const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

  //   await expect(redeemerContract.redeem(redeemer.address, voucher))
  //     .to.emit(contract, 'Transfer')  // transfer from null address to minter
  //     .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
  //     .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
  //     .withArgs(minter.address, redeemer.address, voucher.tokenId);

  //   await expect(redeemerContract.redeem(redeemer.address, voucher))
  //     .to.be.revertedWith('ERC721: token already minted')
  // });

  // it("Should fail to redeem an NFT voucher that's signed by an unauthorized account", async function () {
  //   const signers = await ethers.getSigners()
  //   const rando = signers[signers.length - 1];

  //   const lazyMinter = new LazyMinter({ contract, signer: rando })
  //   const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

  //   await expect(redeemerContract.redeem(redeemer.address, voucher))
  //     .to.be.revertedWith('Signature invalid or unauthorized')
  // });

  // it("Should fail to redeem an NFT voucher that's been modified", async function () {
  //   const lazyMinter = new LazyMinter({ contract, signer: minter })
  //   const voucher = await lazyMinter.createVoucher(2, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
  //   voucher.tokenId = 3
  //   await expect(redeemerContract.redeem(redeemer.address, voucher))
  //     .to.be.revertedWith('Signature invalid or unauthorized')
  // });

  // it("Should fail to redeem an NFT voucher with an invalid signature", async function () {
  //   const lazyMinter = new LazyMinter({ contract, signer: minter })
  //   const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

  //   const dummyData = ethers.utils.randomBytes(128)
  //   voucher.signature = await minter.signMessage(dummyData)

  //   await expect(redeemerContract.redeem(redeemer.address, voucher))
  //     .to.be.revertedWith('Signature invalid or unauthorized')
  // });
})

// describe("Nucleart - Pricing", function () {
//   let contract, redeemerContract, redeemer, minter

//   beforeEach(async function () {
//     const contractData = await deploy()

//     contract = contractData.contract
//     redeemerContract = contractData.redeemerContract
//     redeemer = contractData.redeemer
//     minter = contractData.minter
//   })

//   it("Should redeem if payment is 0 for the first 80 NFTs", async function () {
//     const lazyMinter = new LazyMinter({ contract, signer: minter })
//     const voucherArray = await createArrayOfRandomVouchers(lazyMinter, 80)

//     for (const voucher of voucherArray) {
//       await expect(redeemerContract.redeem(redeemer.address, voucher, { value: 0 }))
//         .to.emit(contract, 'Transfer')  // transfer from null address to minter
//         .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//         .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//         .withArgs(minter.address, redeemer.address, voucher.tokenId)
//     }
//   })


//   it("Should redeem if payment is 0 for the first 80 NFTs and fail for the 81 NFT", async function () {
//     const lazyMinter = new LazyMinter({ contract, signer: minter })
//     const voucherArray = await createArrayOfRandomVouchers(lazyMinter, 81)

//     for (const voucher of voucherArray.slice(0, 80)) {
//       await expect(redeemerContract.redeem(redeemer.address, voucher, { value: 0 }))
//         .to.emit(contract, 'Transfer')  // transfer from null address to minter
//         .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//         .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//         .withArgs(minter.address, redeemer.address, voucher.tokenId)
//     }

//     await expect(redeemerContract.redeem(redeemer.address, voucherArray[80], { value: 0 }))
//       .to.be.revertedWith('Insufficient funds to redeem')
//   })

//   it("Should redeem if payment is following the pricing table for the 1300 first NFTs", async function () {
//     const lazyMinter = new LazyMinter({ contract, signer: minter })
//     const voucherArray = await createArrayOfRandomVouchers(lazyMinter, 1300)
//     const pricingTable = generatePricingTable()
//     let i = 0
//     const minPrice = ethers.constants.WeiPerEther

//     for (const voucher of voucherArray) {
//       await expect(redeemerContract.redeem(redeemer.address, voucher, { value: BigInt(pricingTable[i] * minPrice) }))
//         .to.emit(contract, 'Transfer')  // transfer from null address to minter
//         .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//         .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//         .withArgs(minter.address, redeemer.address, voucher.tokenId)

//       i++
//     }
//   })
// })

// describe("Nucleart - Max supply", function () {
//   let contract, redeemerContract, redeemer, minter

//   beforeEach(async function () {
//     const contractData = await deploy()

//     contract = contractData.contract
//     redeemerContract = contractData.redeemerContract
//     redeemer = contractData.redeemer
//     minter = contractData.minter
//   })


//   it("Should redeem 13080 NFT and fail for the 13081", async function () {
//     const lazyMinter = new LazyMinter({ contract, signer: minter })
//     const voucherArray = await createArrayOfRandomVouchers(lazyMinter, 13081)
//     const pricingTable = generatePricingTable()
//     let i = 0
//     const minPrice = ethers.constants.WeiPerEther

//     for (const voucher of voucherArray.slice(0, 13080)) {
//       await expect(redeemerContract.redeem(redeemer.address, voucher, { value: BigInt(pricingTable[i] * minPrice) }))
//         .to.emit(contract, 'Transfer')  // transfer from null address to minter
//         .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//         .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//         .withArgs(minter.address, redeemer.address, voucher.tokenId)

//       i++
//     }

//     await expect(redeemerContract.redeem(redeemer.address, voucherArray[i], { value: BigInt(pricingTable[i] * minPrice) }))
//       .to.be.revertedWith('All the nucleart warheads have been used')
//   })
// })
