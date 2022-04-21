const createArrayOfRandomVouchers = async (
  lazyMinter,
  numberOfVouchers,
  parentNFTownerAddress
) => {
  const vouchers = [];

  for (let i = 0; i < numberOfVouchers; i++) {
    vouchers.push(
      await lazyMinter.createVoucher({
        uri:
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" +
          i,
        parentNFTChainId: 1,
        parentNFTcontractAddress: "0x1000000000000000000000000000000000000777",
        parentNFTtokenId: i,
        parentNFTownerAddress: parentNFTownerAddress,
      })
    );
  }

  return vouchers;
};

const generatePricingTable = () => {
  const pricingTable = [];

  for (let i = 0; i < 13081; i++) {
    let price;

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
      price = 100001;
    }

    pricingTable.push(price);
  }

  return pricingTable;
};

module.exports = {
  createArrayOfRandomVouchers,
  generatePricingTable,
};
