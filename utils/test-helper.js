const createArrayOfRandomVouchers = async (lazyMinter, numberOfVouchers) => {
  const vouchers = [];
  for (let i = 0; i < numberOfVouchers; i++) {
    vouchers.push(await lazyMinter.createVoucher(i, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy5" + i));
  }
  return vouchers;
}

module.exports = {
  createArrayOfRandomVouchers
}