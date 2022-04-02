# Nucleart - Smart Contracts

> ☢️ Nuke any NFT and receive a new radioactive NFT

## Rules

- Your original NFT will stay on your wallet, Nucleart will never ask you to transfer it
- You can only nuke an NFT that you own (the ownership will be checked using your signature by the oracle)
- Nuking your NFT will result in a new mint of radioactive NFT that will be transfered to you
- You can nuke an NFT only once
- You can nuke the radioactive NFT
- You can only chain nuke 5 times

```
Original NFT => Radioactive NFT (Level 1) => Radioactive NFT (Level 2) => Radioactive NFT (Level 3) => Radioactive NFT (Level 4) => Radioactive NFT (Level 5)
```

## Features (from OpenZeppelin)

- Mintable
- URI Storage
- Roles
- Enumerable
- Royalties

## Pricing model

| From  | To    | Price        |
| ----- | ----- | ------------ |
| 0     | 80    | 0 MATIC      |
| 81    | 320   | 1 MATIC      |
| 321   | 1280  | 10 MATIC     |
| 1281  | 5120  | 100 MATIC    |
| 5121  | 13000 | 1000 MATIC   |
| 13001 | 13070 | 10000 MATIC  |
| 13071 | 13080 | 100000 MATIC |

## Royalties fees

10% of Royalties fees implemented with EIP2981

## Tests

```sh
# Unit tests
npm test

# Static tests
docker pull trailofbits/eth-security-toolbox
docker run -it -v "$PWD":/home/nucleart trailofbits/eth-security-toolbox
cd /home/nucleart
slither .
```
