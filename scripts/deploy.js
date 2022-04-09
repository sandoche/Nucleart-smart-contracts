async function main() {
  const minterPublicAddress = process.env.MINTER_PUBLIC_KEY
  const Nucleart = await ethers.getContractFactory("Nucleart");
  const nucleart = await Nucleart.deploy(minterPublicAddress);

  await nucleart.deployed();

  console.log("Nucleart deployed to:", nucleart.address);
  console.log(nucleart)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });