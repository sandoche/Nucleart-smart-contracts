# Nucleart - Smart Contracts

[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](./LICENSE)
[![Medium Badge](https://badgen.net/badge/icon/medium?icon=medium&label)](https://medium.com/@sandoche)
[![Twitter: sandochee](https://img.shields.io/twitter/follow/sandochee.svg?style=social)](https://twitter.com/sandochee)

> ☢️ Nuke any NFT and receive a new radioactive NFT

https://nucle.art

## ⛓️ Deployed contracts

- [Polygon Mainnet](https://polygonscan.com/address/0x2dba6480433f8d329ad0553c4134678482627f16#code)
- [Mumbai Testnet](https://mumbai.polygonscan.com/address/0xB9DA8b6334ffDc7188355bF48d929d7077cCA9ea#code)

## 📜 Rules

- Your original NFT will stay on your wallet, Nucleart will never ask you to transfer it
- You can only nuke an NFT that you own (the ownership will be checked using your signature by the oracle)
- Nuking your NFT will result in a new mint of radioactive NFT that will be transfered to you
- You can nuke an NFT only once
- You can nuke the radioactive NFT
- You can only chain nuke 5 times

```
Original NFT => Radioactive NFT (Level 1) => Radioactive NFT (Level 2) => Radioactive NFT (Level 3) => Radioactive NFT (Level 4) => Radioactive NFT (Level 5)
```

## 💡 Features (from OpenZeppelin)

- Mintable
- URI Storage
- Roles
- Enumerable
- Royalties

## 🏷️ Pricing model

| From  | To    | Price        |
| ----- | ----- | ------------ |
| 0     | 80    | 0 MATIC      |
| 81    | 320   | 1 MATIC      |
| 321   | 1280  | 10 MATIC     |
| 1281  | 5120  | 100 MATIC    |
| 5121  | 13000 | 1000 MATIC   |
| 13001 | 13070 | 10000 MATIC  |
| 13071 | 13080 | 100000 MATIC |

## 🎟️ Royalties fees

10% of Royalties fees implemented with EIP2981

## ✅ Tests

```sh
# Unit & integration tests
npm test

# Static tests
docker pull trailofbits/eth-security-toolbox
docker run -it -v "$PWD":/home/nucleart trailofbits/eth-security-toolbox
cd /home/nucleart
slither .
```

## 🚀 Deploy

```sh
cp .env.dist .env
# edit .env and set your own values

# Deploy on hardhat node
npm run hardhat-node
npm run deploy:localhost

# Deploy on mumbai
npm run deploy:mumbai

# Verify contract
npx hardhat verify --network mumbai <contract_address> <minter_address>
```

## 📄 License

[MIT License](./LICENSE)

Copyright (c) Sandoche Adittane
