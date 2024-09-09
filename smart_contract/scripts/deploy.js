// require("@nomiclabs/hardhat-waffle");
// const { vars } = require("hardhat/config");

// const SEPOLIA_API_KEY = vars.get("SEPOLIA_API_KEY");
// const ACCOUNT_PRIVATE_KEY = vars.get("ACCOUNT_PRIVATE_KEY");

// module.exports = {
//   solidity: "0.8.0",
//   networks: {
//     sepolia: {
//       url: `https://eth-sepolia.g.alchemy.com/v2/${SEPOLIA_API_KEY}`,
//       accounts: [ACCOUNT_PRIVATE_KEY],
//     },
//   },
// };

async function main() {
  const RentalPayments = await ethers.getContractFactory("RentalPayments");
  const contract = await RentalPayments.deploy();

  await contract.waitForDeployment();
  console.log("Contract deployed to address:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
