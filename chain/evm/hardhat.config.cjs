require('@nomicfoundation/hardhat-ethers');
require('dotenv').config();

/**
 * Minimal Hardhat project used only for compiling/deploying the commitment registry.
 *
 * Env:
 * - EVM_RPC_URL
 * - EVM_PRIVATE_KEY
 */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    target: {
      url: process.env.EVM_RPC_URL || '',
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
    },
  },
};
