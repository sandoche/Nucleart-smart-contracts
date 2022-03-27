const { expect } = require("chai");
const { ethers } = require("hardhat");
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

describe("Nucleart", function () {
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
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")

    await expect(redeemerContract.redeem(redeemer.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId);
  });
})