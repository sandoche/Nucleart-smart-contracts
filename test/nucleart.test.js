const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  createArrayOfRandomVouchers,
  generatePricingTable
} = require('../utils/test-helper')
const { LazyMinter } = require('../utils/lazy-minter.js')

async function deploy() {
  const [minter, newAdmin, newMinter, redeemer, _] = await ethers.getSigners()

  let factory = await ethers.getContractFactory('Nucleart', minter)
  const contract = await factory.deploy(minter.address)

  // the redeemerContract is an instance of the contract that's wired up to the redeemer's signing key
  const redeemerFactory = factory.connect(redeemer)
  const redeemerContract = redeemerFactory.attach(contract.address)

  const newAdminFactory = factory.connect(newAdmin)
  const newAdminContract = newAdminFactory.attach(contract.address)

  const newMinterFactory = factory.connect(newMinter)
  const newMinterContract = newMinterFactory.attach(contract.address)

  return {
    minter,
    redeemer,
    newAdmin,
    newMinter,
    contract,
    redeemerContract,
    newAdminContract,
    newMinterContract
  }
}

describe('Nucleart - Signature', function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it('Should deploy', async function () {
    const signers = await ethers.getSigners()
    const minter = signers[0].address

    const NucleartFactory = await ethers.getContractFactory('Nucleart')
    const nucleart = await NucleartFactory.deploy(minter)
    await nucleart.deployed()
  })

  it('Should redeem an NFT from a signed voucher', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer') // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000999', minter.address, 0)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, 0)
  })

  it("Should fail to redeem an NFT voucher that's signed by an unauthorized account", async function () {
    const signers = await ethers.getSigners()
    const rando = signers[signers.length - 1]

    const lazyMinter = new LazyMinter({ contract, signer: rando })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    await expect(
      redeemerContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('Signature invalid or unauthorized')
  })

  it("Should fail to redeem an NFT voucher that's been modified", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })

    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    voucher.parentNFTChainId = 3
    await expect(
      redeemerContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('Signature invalid or unauthorized')
  })

  it('Should fail to redeem an NFT voucher with an invalid signature', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    const dummyData = ethers.utils.randomBytes(128)
    voucher.signature = await minter.signMessage(dummyData)

    await expect(
      redeemerContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('Signature invalid or unauthorized')
  })
})

describe('Nucleart - Roles', function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
    newAdmin = contractData.newAdmin
    newMinter = contractData.newMinter
    newAdminContract = contractData.newAdminContract
    newMinterContract = contractData.newMinterContract
  })

  it('Should not let a non admin user to change the minter', async function () {
    await expect(
      newMinterContract.replaceMinterRole(minter.address, newMinter.address)
    ).to.be.revertedWith('AccessControl')
  })

  it('Should not let random users to change the admin', async function () {
    await expect(
      newAdminContract.replaceAdminRole(minter.address, newAdmin.address)
    ).to.be.revertedWith('AccessControl')
  })

  it("Should not let the new minter to redeem an NFT voucher that's signed by an unauthorized account", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: newMinter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    await expect(
      newMinterContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('Signature invalid or unauthorized')
  })

  it('Should let a new minter mint after being assigned the minter role but not the previous minter', async function () {
    const tx = await contract.replaceMinterRole(
      minter.address,
      newMinter.address
    )
    await tx.wait()

    const lazyMinter = new LazyMinter({ contract, signer: newMinter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    await expect(newMinterContract.redeem(redeemer.address, voucher))
      .to.emit(newMinterContract, 'Transfer') // transfer from null address to minter
      .withArgs(
        '0x0000000000000000000000000000000000000999',
        newMinter.address,
        0
      )
      .and.to.emit(newMinterContract, 'Transfer') // transfer from minter to redeemer
      .withArgs(newMinter.address, redeemer.address, 0)

    const lazyMinterOldMinter = new LazyMinter({ contract, signer: minter })
    const voucherOldMinter = await lazyMinterOldMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 2,
      parentNFTownerAddress: redeemer.address
    })

    await expect(
      contract.redeem(redeemer.address, voucherOldMinter)
    ).to.be.revertedWith('Signature invalid or unauthorized')
  })

  it('Should let a new admin withdraw after being assigned the admin role but not the previous admin', async function () {
    const tx = await contract.replaceAdminRole(minter.address, newAdmin.address)
    await tx.wait()

    await expect(
      newAdminContract.withdraw({ value: 0 })
    ).not.to.be.revertedWith('AccessControl')

    await expect(contract.withdraw({ value: 0 })).to.be.revertedWith(
      'AccessControl'
    )
  })
})

describe('Nucleart - Rules', function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it("Should fail to nuke an NFT that's not owned by the redeemer", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: minter.address
    })

    await expect(
      redeemerContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('The redeemer should own this NFT')
  })

  it("Should fail to nuke an NFT that's already been nuked", async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer') // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000999', minter.address, 0)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, 0)

    await expect(
      redeemerContract.redeem(redeemer.address, voucher)
    ).to.be.revertedWith('This NFT has already been nuked')
  })

  it('Should auto increment the tokenId', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      3,
      redeemer.address
    )

    let i = 0

    for (const voucher of voucherArray) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, { value: 0 })
      )
        .to.emit(contract, 'Transfer')
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer')
        .withArgs(minter.address, redeemer.address, i)
      i++
    }
  })

  it('Should increase the level of the NFT when chained nuked', async function () {
    const chainId = await contract.getChainID()
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherOfInitialNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    const tx = await redeemerContract.redeem(
      redeemer.address,
      voucherOfInitialNuke,
      { value: 0 }
    )
    const rc = await tx.wait()
    const event = rc.events.find((event) => event.event === 'Transfer')

    const voucherOfFirstNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: event.address,
      parentNFTtokenId: event.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txSecond = await redeemerContract.redeem(
      redeemer.address,
      voucherOfFirstNuke,
      { value: 0 }
    )
    await txSecond.wait()

    const originalNFT = {
      chainId: voucherOfInitialNuke.parentNFTChainId,
      contractAddress: voucherOfInitialNuke.parentNFTcontractAddress,
      tokenId: voucherOfInitialNuke.parentNFTtokenId
    }

    const radioactiveNFT = {
      chainId: voucherOfFirstNuke.parentNFTChainId,
      contractAddress: voucherOfFirstNuke.parentNFTcontractAddress,
      tokenId: voucherOfFirstNuke.parentNFTtokenId
    }

    const levelOfInitialNFT = await contract.getLevel(originalNFT)
    const levelOfFirstRadioactiveNFT = await contract.getLevel(radioactiveNFT)

    expect(levelOfInitialNFT).to.equal(0)
    expect(levelOfFirstRadioactiveNFT).to.equal(1)
  })

  it('Should return a level of 0 to a NFT that has not been nuked yet', async function () {
    const randomNft = {
      chainId: 123,
      contractAddress: '0x0000000000000000000000000000000000000123',
      tokenId: 123135
    }

    const randomNftLevel = await contract.getLevel(randomNft)

    expect(randomNftLevel).to.equal(0)
  })

  it('Should increase the level of the NFT when chained nuked until 5 and would fail over 5', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherOfInitialNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    const tx = await redeemerContract.redeem(
      redeemer.address,
      voucherOfInitialNuke,
      { value: 0 }
    )
    const rc = await tx.wait()
    const event = rc.events.find((event) => event.event === 'Transfer')

    const chainId = await contract.getChainID()

    const voucherOfFirstNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: event.address,
      parentNFTtokenId: event.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txFirst = await redeemerContract.redeem(
      redeemer.address,
      voucherOfFirstNuke,
      { value: 0 }
    )
    const rcFirst = await txFirst.wait()
    const eventFirst = rcFirst.events.find(
      (event) => event.event === 'Transfer'
    )

    const voucherOfSecondNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventFirst.address,
      parentNFTtokenId: eventFirst.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txSecond = await redeemerContract.redeem(
      redeemer.address,
      voucherOfSecondNuke,
      { value: 0 }
    )
    await txSecond.wait()
    const rcSecond = await txSecond.wait()
    const eventSecond = rcSecond.events.find(
      (event) => event.event === 'Transfer'
    )

    const voucherOfThirdNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventSecond.address,
      parentNFTtokenId: eventSecond.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txThird = await redeemerContract.redeem(
      redeemer.address,
      voucherOfThirdNuke,
      { value: 0 }
    )
    await txThird.wait()
    const rcThird = await txThird.wait()
    const eventThird = rcThird.events.find(
      (event) => event.event === 'Transfer'
    )

    const voucherOfFourthNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventThird.address,
      parentNFTtokenId: eventThird.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txFourth = await redeemerContract.redeem(
      redeemer.address,
      voucherOfFourthNuke,
      { value: 0 }
    )
    await txFourth.wait()
    const rcFourth = await txFourth.wait()
    const eventFourth = rcFourth.events.find(
      (event) => event.event === 'Transfer'
    )

    const voucherOfFifthNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventFourth.address,
      parentNFTtokenId: eventFourth.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txFifth = await redeemerContract.redeem(
      redeemer.address,
      voucherOfFifthNuke,
      { value: 0 }
    )
    await txFifth.wait()
    const rcFifth = await txFifth.wait()
    const eventFifth = rcFifth.events.find(
      (event) => event.event === 'Transfer'
    )

    const nftInitial = {
      chainId: voucherOfInitialNuke.parentNFTChainId,
      contractAddress: voucherOfInitialNuke.parentNFTcontractAddress,
      tokenId: voucherOfInitialNuke.parentNFTtokenId
    }

    const nftFirst = {
      chainId: voucherOfFirstNuke.parentNFTChainId,
      contractAddress: voucherOfFirstNuke.parentNFTcontractAddress,
      tokenId: voucherOfFirstNuke.parentNFTtokenId
    }

    const nftSecond = {
      chainId: voucherOfSecondNuke.parentNFTChainId,
      contractAddress: voucherOfSecondNuke.parentNFTcontractAddress,
      tokenId: voucherOfSecondNuke.parentNFTtokenId
    }

    const nftThird = {
      chainId: voucherOfThirdNuke.parentNFTChainId,
      contractAddress: voucherOfThirdNuke.parentNFTcontractAddress,
      tokenId: voucherOfThirdNuke.parentNFTtokenId
    }

    const nftFourth = {
      chainId: voucherOfFourthNuke.parentNFTChainId,
      contractAddress: voucherOfFourthNuke.parentNFTcontractAddress,
      tokenId: voucherOfFourthNuke.parentNFTtokenId
    }

    const nftFifth = {
      chainId: voucherOfFifthNuke.parentNFTChainId,
      contractAddress: voucherOfFifthNuke.parentNFTcontractAddress,
      tokenId: voucherOfFifthNuke.parentNFTtokenId
    }

    const levelZero = await contract.getLevel(nftInitial)
    const levelFirst = await contract.getLevel(nftFirst)
    const levelSecond = await contract.getLevel(nftSecond)
    const levelThird = await contract.getLevel(nftThird)
    const levelFourth = await contract.getLevel(nftFourth)
    const levelFifth = await contract.getLevel(nftFifth)

    expect(levelZero).to.be.equal(0)
    expect(levelFirst).to.equal(1)
    expect(levelSecond).to.equal(2)
    expect(levelThird).to.equal(3)
    expect(levelFourth).to.equal(4)
    expect(levelFifth).to.equal(5)

    const voucherOfSixthNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventFifth.address,
      parentNFTtokenId: eventFifth.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    await expect(
      redeemerContract.redeem(redeemer.address, voucherOfSixthNuke, {
        value: 0
      })
    ).to.be.revertedWith('This NFT reached its maximum level of radioactivity')
  })

  it('Should not be possible to nuke twice a nuked NFT', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherOfInitialNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: 1,
      parentNFTcontractAddress: '0x0000000000000000000000000000000000000999',
      parentNFTtokenId: 1,
      parentNFTownerAddress: redeemer.address
    })

    const tx = await redeemerContract.redeem(
      redeemer.address,
      voucherOfInitialNuke,
      { value: 0 }
    )
    const rc = await tx.wait()
    const event = rc.events.find((event) => event.event === 'Transfer')

    const chainId = await contract.getChainID()

    const voucherOfFirstNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: event.address,
      parentNFTtokenId: event.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txFirst = await redeemerContract.redeem(
      redeemer.address,
      voucherOfFirstNuke,
      { value: 0 }
    )
    const rcFirst = await txFirst.wait()
    const eventFirst = rcFirst.events.find(
      (event) => event.event === 'Transfer'
    )

    const voucherOfSecondNuke = await lazyMinter.createVoucher({
      uri: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      parentNFTChainId: chainId,
      parentNFTcontractAddress: eventFirst.address,
      parentNFTtokenId: eventFirst.args.tokenId.toNumber(),
      parentNFTownerAddress: redeemer.address
    })

    const txSecond = await redeemerContract.redeem(
      redeemer.address,
      voucherOfSecondNuke,
      { value: 0 }
    )
    await txSecond.wait()
    const rcSecond = await txSecond.wait()

    await expect(
      redeemerContract.redeem(redeemer.address, voucherOfFirstNuke, {
        value: 0
      })
    ).to.be.revertedWith('This NFT has already been nuked')
  })
})

describe('Nucleart - Pricing', function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it('Should redeem if payment is 0 for the first 80 NFTs', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      80,
      redeemer.address
    )
    let i = 0

    for (const voucher of voucherArray) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, { value: 0 })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }
  })

  it('Should redeem if payment is 0 for the first 80 NFTs and fail for the 81 NFT', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      81,
      redeemer.address
    )
    let i = 0

    for (const voucher of voucherArray.slice(0, 80)) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, { value: 0 })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }

    await expect(
      redeemerContract.redeem(redeemer.address, voucherArray[80], { value: 0 })
    ).to.be.revertedWith('INSUFFICIENT_FUNDS')
  })

  it('Should redeem if payment is following the pricing table for the 1300 first NFTs', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      1300,
      redeemer.address
    )
    const pricingTable = generatePricingTable()
    let i = 0
    const minPrice = ethers.constants.WeiPerEther

    for (const voucher of voucherArray) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, {
          value: BigInt(pricingTable[i] * minPrice)
        })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }
  })

  it('Should fail if withdrawer is not DEFAULT_ADMIN_ROLE', async function () {
    await expect(redeemerContract.withdraw({ value: 0 })).to.be.revertedWith(
      'AccessControl'
    )
  })

  it('Should have a balance that grows of 20 MATIC', async function () {
    const TOTAL_GAIN_TARGET = 20
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      100,
      redeemer.address
    )
    const pricingTable = generatePricingTable()
    let i = 0
    const minPrice = ethers.constants.WeiPerEther

    const contractBalanceInitial = await contract.provider.getBalance(
      contract.address
    )

    for (const voucher of voucherArray) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, {
          value: BigInt(pricingTable[i] * minPrice)
        })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }

    const contractBalanceFinal = await contract.provider.getBalance(
      contract.address
    )

    const balance = contractBalanceFinal.sub(contractBalanceInitial)

    expect(balance).to.be.equal(BigInt(TOTAL_GAIN_TARGET * minPrice))
  })

  it('Should let withdraw the balance to any address when called from DEFAULT_ADMIN_ROLE', async function () {
    const TOTAL_GAIN_TARGET = 20
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      100,
      redeemer.address
    )
    const pricingTable = generatePricingTable()
    let i = 0
    const minPrice = ethers.constants.WeiPerEther

    for (const voucher of voucherArray) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, {
          value: BigInt(pricingTable[i] * minPrice)
        })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }

    const initialBalanceAdmin = await contract.provider.getBalance(
      minter.address
    )

    const tx = await contract.withdraw({ value: 0 })
    const rc = await tx.wait()

    expect(await contract.provider.getBalance(contract.address)).to.be.equal(0)

    const newBalanceAdmin = await contract.provider.getBalance(minter.address)
    const gain = newBalanceAdmin.sub(initialBalanceAdmin)
    const gasPaid = rc.gasUsed.mul(await contract.provider.getGasPrice())

    expect(gain).to.be.above(BigInt(TOTAL_GAIN_TARGET * minPrice - 2 * gasPaid))
  })
})

describe('Nucleart - Max supply', function () {
  let contract, redeemerContract, redeemer, minter

  beforeEach(async function () {
    const contractData = await deploy()

    contract = contractData.contract
    redeemerContract = contractData.redeemerContract
    redeemer = contractData.redeemer
    minter = contractData.minter
  })

  it('Should redeem 13080 NFT and fail for the 13081', async function () {
    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucherArray = await createArrayOfRandomVouchers(
      lazyMinter,
      13081,
      redeemer.address
    )
    const pricingTable = generatePricingTable()
    let i = 0
    const minPrice = ethers.constants.WeiPerEther

    for (const voucher of voucherArray.slice(0, 13080)) {
      await expect(
        redeemerContract.redeem(redeemer.address, voucher, {
          value: BigInt(pricingTable[i] * minPrice)
        })
      )
        .to.emit(contract, 'Transfer') // transfer from null address to minter
        .withArgs(
          '0x0000000000000000000000000000000000000999',
          minter.address,
          i
        )
        .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
        .withArgs(minter.address, redeemer.address, i)

      i++
    }

    await expect(
      redeemerContract.redeem(redeemer.address, voucherArray[i], {
        value: BigInt(pricingTable[i] * minPrice)
      })
    ).to.be.revertedWith('All the nucleart warheads have been used')
  })
})
