# AgentMemory – Solana Commitment Program

This folder contains a minimal Solana program that stores a commitment record in a PDA account.

## What gets stored on-chain
For each `(agentId, memoryId)` pair, the program creates a PDA:

- seeds: `"am1"`, `sha256(agentId)`, `sha256(memoryId)`
- data: version + `contentHash(32)` + `cidHash(32)` + `committer` + `slot` + `timestamp`

## Build

You need the Solana toolchain installed.

```bash
cd chain/solana/program
cargo build-sbf
```

The output `.so` will be under `target/deploy/`.

## Deploy

```bash
solana program deploy target/deploy/agentmemory_commitments.so
```

Set the deployed program id in the API env:

- `SOLANA_PROGRAM_ID=<program_id>`

