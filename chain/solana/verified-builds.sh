#!/usr/bin/env bash
set -euo pipefail

: "${NETWORK_URL:?Set NETWORK_URL (e.g. https://api.devnet.solana.com)}"
: "${PROGRAM_ID:?Set PROGRAM_ID (your deployed program pubkey)}"
: "${REPO_URL:?Set REPO_URL (e.g. https://github.com/<owner>/<repo>)}"
: "${COMMIT_HASH:?Set COMMIT_HASH (git commit hash that matches the deployed binary)}"

PROGRAM_LIB_NAME=${PROGRAM_LIB_NAME:-agentmemory_commitments}
MOUNT_PATH=${MOUNT_PATH:-chain/solana/program}
MODE=${MODE:-local}
BASE_IMAGE=${BASE_IMAGE:-}
DO_DEPLOY=${DO_DEPLOY:-0}
DO_REMOTE=${DO_REMOTE:-0}

if ! command -v solana-verify >/dev/null 2>&1; then
  echo "solana-verify not found. Install with: cargo install solana-verify" >&2
  exit 1
fi

if [[ "$MODE" != "local" && "$MODE" != "remote" ]]; then
  echo "Invalid MODE: $MODE (expected 'local' or 'remote')" >&2
  exit 1
fi

BUILD_ARGS=()
if [[ -n "$BASE_IMAGE" ]]; then
  BUILD_ARGS+=(--base-image "$BASE_IMAGE")
fi

VERIFY_ARGS=()
if [[ -n "$BASE_IMAGE" ]]; then
  VERIFY_ARGS+=(--base-image "$BASE_IMAGE")
fi

if [[ "$MODE" == "remote" && "$DO_DEPLOY" == "1" ]]; then
  echo "DO_DEPLOY=1 is not supported in MODE=remote (no local .so artifact is produced)." >&2
  echo "Use MODE=local to build the .so (Docker) or deploy separately." >&2
  exit 1
fi

if [[ "$MODE" == "local" ]]; then
  echo "==> Building verifiable artifact (docker)"
  if ((${#BUILD_ARGS[@]})); then
    solana-verify build "${BUILD_ARGS[@]}" --library-name "$PROGRAM_LIB_NAME"
  else
    solana-verify build --library-name "$PROGRAM_LIB_NAME"
  fi

  SO_PATH="target/deploy/${PROGRAM_LIB_NAME}.so"
  if [[ ! -f "$SO_PATH" ]]; then
    echo "Expected build output at $SO_PATH but it was not found." >&2
    exit 1
  fi

  echo "==> Executable hash"
  solana-verify get-executable-hash "$SO_PATH" || true

  if [[ "$DO_DEPLOY" == "1" ]]; then
    echo "==> Deploying/upgrading program $PROGRAM_ID on $NETWORK_URL"
    solana program deploy \
      -u "$NETWORK_URL" \
      "$SO_PATH" \
      --program-id "$PROGRAM_ID" \
      --use-rpc \
      --max-sign-attempts 100
  else
    echo "==> Skipping deploy (set DO_DEPLOY=1 to deploy/upgrade)"
  fi

  echo "==> Verifying from repo and uploading PDA metadata (answer YES when prompted)"
  if ((${#VERIFY_ARGS[@]})); then
    solana-verify verify-from-repo \
      "${VERIFY_ARGS[@]}" \
      -u "$NETWORK_URL" \
      --program-id "$PROGRAM_ID" \
      "$REPO_URL" \
      --commit-hash "$COMMIT_HASH" \
      --library-name "$PROGRAM_LIB_NAME" \
      --mount-path "$MOUNT_PATH"
  else
    solana-verify verify-from-repo \
      -u "$NETWORK_URL" \
      --program-id "$PROGRAM_ID" \
      "$REPO_URL" \
      --commit-hash "$COMMIT_HASH" \
      --library-name "$PROGRAM_LIB_NAME" \
      --mount-path "$MOUNT_PATH"
  fi
else
  echo "==> Verifying from repo via remote builder (no local Docker)"
  if ((${#VERIFY_ARGS[@]})); then
    solana-verify verify-from-repo \
      --remote \
      "${VERIFY_ARGS[@]}" \
      -u "$NETWORK_URL" \
      --program-id "$PROGRAM_ID" \
      "$REPO_URL" \
      --commit-hash "$COMMIT_HASH" \
      --library-name "$PROGRAM_LIB_NAME" \
      --mount-path "$MOUNT_PATH"
  else
    solana-verify verify-from-repo \
      --remote \
      -u "$NETWORK_URL" \
      --program-id "$PROGRAM_ID" \
      "$REPO_URL" \
      --commit-hash "$COMMIT_HASH" \
      --library-name "$PROGRAM_LIB_NAME" \
      --mount-path "$MOUNT_PATH"
  fi
fi

if [[ "$DO_REMOTE" == "1" ]]; then
  echo "==> Submitting remote verification job"
  UPLOADER=$(solana address)
  solana-verify remote submit-job --program-id "$PROGRAM_ID" --uploader "$UPLOADER"
else
  echo "==> Skipping remote job (set DO_REMOTE=1 to submit)"
fi
