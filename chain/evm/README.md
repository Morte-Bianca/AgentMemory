# AgentMemory – EVM Commitment Registry

This folder contains a minimal Hardhat project to compile/deploy the EVM commitment registry contract used by the API.

## What gets stored on-chain
- `contentHash` (bytes32): SHA-256 of the canonical plaintext payload (computed server-side)
- `cidHash` (bytes32): SHA-256 of the CID string
- `committer`, `blockNumber`, `timestamp`

The full `cid` string is emitted in the `CommitmentSubmitted` event for auditability/indexing.

## Deploy

1) Install dependencies:

```bash
cd chain/evm
npm i
```

2) Export env vars (same ones you already use for the API EVM commits):

```bash
export EVM_RPC_URL="..."
export EVM_PRIVATE_KEY="0x..."
```

3) Compile + deploy:

```bash
npm run compile
npm run deploy:target
```

It prints a contract address. Set that in the API deployment env:

- `EVM_CONTRACT_ADDRESS=<deployed_address>`

