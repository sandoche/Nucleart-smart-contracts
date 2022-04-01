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
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000999', minter.address, 0)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, 0);
  });

  it("Should fail to redeem an NFT voucher that's signed by an unauthorized account", async function () {
    const signers = await ethers.getSigners()
    const rando = signers[signers.length - 1];

    const lazyMinter = new LazyMinter({ contract, signer: rando })
    const voucher = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should fail to redeem an NFT voucher that's been modified", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })

    const voucher = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    voucher.parentNFTChainId = 3
    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should fail to redeem an NFT voucher with an invalid signature", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    const dummyData = ethers.utils.randomBytes(128)
    voucher.signature = await minter.signMessage(dummyData)

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });
})

describe("Nucleart - Rules", function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it("Should fail to nuke an NFT that's already been nuked", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000999', minter.address, 0)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, 0);

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.be.revertedWith('This NFT has already been nuked')
  });

  it("Should auto increment the tokenId", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(lazyMinter, 3)

    let i = 0

    for (const voucher of voucherArray) {
      await expect(redeemerContract.redeem(redeemer.address, voucher, { value: 0 }))
        .to.emit(contract, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000999', minter.address, i)
        .and.to.emit(contract, 'Transfer')
        .withArgs(minter.address, redeemer.address, i)
      i++
    }
  });


  it("Should increase the level of the NFT when chained nuked", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherOfInitialNuke = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: 1,
      parentNFTcontractAddress: "0x0000000000000000000000000000000000000999",
      parentNFTtokenId: 1,
    })

    const tx = await redeemerContract.redeem(redeemer.address, voucherOfInitialNuke, { value: 0 })
    const rc = await tx.wait();
    const event = rc.events.find(event => event.event === 'Transfer');

    const chainId = await contract.getChainID()

    const voucherOfSecondNuke = await lazyMinter.createVoucher({
      uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      parentNFTChainId: chainId,
      parentNFTcontractAddress: event.address,
      parentNFTtokenId: event.args.tokenId.toNumber()
    });

    const txSecond = await redeemerContract.redeem(redeemer.address, voucherOfSecondNuke, { value: 0 })
    await txSecond.wait();

    const nftFirst = {
      chainId: voucherOfInitialNuke.parentNFTChainId,
      contractAddress: voucherOfInitialNuke.parentNFTcontractAddress,
      tokenId: voucherOfInitialNuke.parentNFTtokenId
    }

    const nftSecond = {
      chainId: voucherOfSecondNuke.parentNFTChainId,
      contractAddress: voucherOfSecondNuke.parentNFTcontractAddress,
      tokenId: voucherOfSecondNuke.parentNFTtokenId
    }

    const levelFirst = await contract.getLevel(nftFirst)
    const levelSecond = await contract.getLevel(nftSecond)

    expect(levelFirst).to.equal(1)
    expect(levelSecond).to.equal(2)
  });

  it("Should return a level of 0 to a NFT that has not been nuked yet", async function () {
    const randomNft = {
      chainId: 123,
      contractAddress: "0x0000000000000000000000000000000000000123",
      tokenId: 123135
    }

    const randomNftLevel = await contract.getLevel(randomNft)

    expect(randomNftLevel).to.equal(0)
  });
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
//         .withArgs('0x0000000000000000000000000000000000000999', minter.address, voucher.tokenId)
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
//         .withArgs('0x0000000000000000000000000000000000000999', minter.address, voucher.tokenId)
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
//         .withArgs('0x0000000000000000000000000000000000000999', minter.address, voucher.tokenId)
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
//         .withArgs('0x0000000000000000000000000000000000000999', minter.address, voucher.tokenId)
//         .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//         .withArgs(minter.address, redeemer.address, voucher.tokenId)

//       i++
//     }

//     await expect(redeemerContract.redeem(redeemer.address, voucherArray[i], { value: BigInt(pricingTable[i] * minPrice) }))
//       .to.be.revertedWith('All the nucleart warheads have been used')
//   })
// })
