// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentMemoryCommitments
/// @notice Minimal commitment registry for AgentMemory.
/// @dev Stores only hashes on-chain. CID is emitted in an event for indexing/auditability.
contract AgentMemoryCommitments {
    struct Commitment {
        bytes32 contentHash;
        bytes32 cidHash;
        address committer;
        uint64 blockNumber;
        uint64 timestamp;
    }

    // key = sha256(bytes(agentId) || "|" || bytes(memoryId))
    mapping(bytes32 => Commitment) private commitments;

    event CommitmentSubmitted(
        bytes32 indexed key,
        string agentId,
        string memoryId,
        bytes32 contentHash,
        string cid,
        bytes32 cidHash,
        address indexed committer
    );

    error AlreadyCommitted(bytes32 key);

    function computeKey(string memory agentId, string memory memoryId) public pure returns (bytes32) {
        return sha256(bytes(string.concat(agentId, "|", memoryId)));
    }

    function getCommitment(string memory agentId, string memory memoryId)
        external
        view
        returns (Commitment memory)
    {
        bytes32 key = computeKey(agentId, memoryId);
        return commitments[key];
    }

    /// @notice Commits a memory proof.
    /// @param agentId Agent id in AgentMemory (string)
    /// @param memoryId Memory id in AgentMemory (string)
    /// @param contentHash SHA-256 hash of canonical plaintext payload (hex -> bytes32 off-chain)
    /// @param cid IPFS CID string
    function commit(string calldata agentId, string calldata memoryId, bytes32 contentHash, string calldata cid)
        external
    {
        bytes32 key = computeKey(agentId, memoryId);
        Commitment storage existing = commitments[key];
        if (existing.committer != address(0)) {
            revert AlreadyCommitted(key);
        }

        bytes32 cidHash = sha256(bytes(cid));

        commitments[key] = Commitment({
            contentHash: contentHash,
            cidHash: cidHash,
            committer: msg.sender,
            blockNumber: uint64(block.number),
            timestamp: uint64(block.timestamp)
        });

        emit CommitmentSubmitted(key, agentId, memoryId, contentHash, cid, cidHash, msg.sender);
    }
}
