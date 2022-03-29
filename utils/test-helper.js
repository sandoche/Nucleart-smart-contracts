const createArrayOfRandomVouchers = async (lazyMinter, numberOfVouchers) => {
  const vouchers = []

  for (let i = 0; i < numberOfVouchers; i++) {
    vouchers.push(await lazyMinter.createVoucher(i, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy5" + i))
  }

  return vouchers
}

const generatePricingTable = () => {
  const pricingTable = []

  for (let i = 0; i < 13080; i++) {
    let price

    if (i < 80) {
      price = 0;
    } else if (i < 320) {
        price = 1;
    } else if (i < 1280) {
        price = 10;
    } else if (i < 5120) {
        price = 100;
    } else if (i < 13000) {
        price = 1000;
    } else if (i < 13070) {
        price = 10000;
    } else {
        price = 100000;
    }

    pricingTable.push(price)
  }

  return pricingTable
}

module.exports = {
  createArrayOfRandomVouchers,
  generatePricingTable
}