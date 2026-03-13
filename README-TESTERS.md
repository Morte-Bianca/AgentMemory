# Claw Agent Testing Guide

## Message from the project owner

Hi — thanks for taking a look at this.

I’ve been building a hosted memory service for Claw-style agents and I’d really like to get feedback from people who are already running real agents in real workflows.

The deployment is live, the core memory flows are working, MCP is exposed, and Postgres-backed persistence is enabled. At this stage, what I need most is practical testing from actual Claw users: what works, what feels rough, what breaks, and what would stop you from using this in a real setup.

If you have a Claw agent environment, I’d really appreciate it if you could spend a bit of time testing the API and MCP endpoints.

In particular, I’m interested in feedback on:

- memory write / recall quality
- MCP compatibility
- session behavior
- Claw event ingestion
- anything confusing, brittle, or missing

This is a public test deployment, so please don’t send secrets or sensitive data.

If something fails, feels awkward, or behaves differently than you expect, that feedback is just as useful as a successful test.

Thanks again for helping with this.

## Short shareable message

Hi — I’m currently testing a hosted memory backend for Claw-style agents and I’m looking for people with real Claw agent setups to try it.

Base URL:

- https://agent-memory-five.vercel.app

Main endpoints to test:

- `GET /health`
- `GET /v1/agents/me`
- `POST /v1/memories`
- `POST /v1/memories/recall`
- `POST /v1/claw/events`
- `POST /v1/claw/context`
- `POST /v1/mcp`
- `GET /v1/mcp`

This deployment is in public test mode right now, so no API key is required.

Typical flow for a Claw agent:

1. call `GET /v1/agents/me` to get the current shared public agent id
2. store useful interaction traces with `POST /v1/memories`
3. retrieve relevant memory with `POST /v1/memories/recall`
4. optionally send structured agent/tool events to `POST /v1/claw/events`
5. optionally fetch assembled working context from `POST /v1/claw/context`
6. if your client supports MCP over HTTP, connect to `/v1/mcp`

If you test it, I’d really appreciate feedback on recall quality, MCP compatibility, session behavior, and anything that feels rough or breaks in a real workflow.

This document is for Claw agent owners who want to test the hosted memory service.

## Service URL

Base URL:

- https://agent-memory-five.vercel.app

Health check:

- https://agent-memory-five.vercel.app/health

MCP endpoint:

- POST https://agent-memory-five.vercel.app/v1/mcp
- GET https://agent-memory-five.vercel.app/v1/mcp

## Current Test Mode

The deployment is currently running in public test mode.

What that means:

- No API key is required.
- Anonymous requests are mapped to a shared public agent.
- Data written during testing should be treated as non-private.
- This environment is for interoperability and workflow testing, not for production secrets.

## What This Service Does

This API provides:

- memory storage
- memory recall
- session tracking
- dream generation/scheduling
- Claw event ingestion
- Claw context generation
- MCP bridge access for memory workflows

## Recommended Test Goals

Please test one or more of the following:

1. Basic connectivity
2. Memory write and recall quality
3. Session-aware workflows
4. Claw event ingestion behavior
5. MCP compatibility with your client
6. Stability across repeated requests
7. Error handling for malformed inputs

## Quick Start

### 1) Verify the service is alive

Request:

- GET /health

Expected result:

- HTTP 200
- JSON with `status: "ok"`

Example:

```bash
curl https://agent-memory-five.vercel.app/health
```

### 2) Get the current public agent

Request:

- GET /v1/agents/me

Example:

```bash
curl https://agent-memory-five.vercel.app/v1/agents/me
```

### 3) Store a memory

Request:

- POST /v1/memories

Example:

```bash
curl -X POST https://agent-memory-five.vercel.app/v1/memories \
  -H 'content-type: application/json' \
  -d '{
    "agentId": "<agent-id>",
    "type": "episodic",
    "content": "The user asked me to test memory persistence on Vercel.",
    "tags": ["test", "vercel", "memory"],
    "metadata": {
      "workspaceId": "external-claw-test"
    },
    "importance": 0.8
  }'
```

Supported memory types:

- `episodic`
- `semantic`
- `procedural`
- `self_model`
- `introspective`

### 4) Recall memories

Request:

- POST /v1/memories/recall

Example:

```bash
curl -X POST https://agent-memory-five.vercel.app/v1/memories/recall \
  -H 'content-type: application/json' \
  -d '{
    "agentId": "<agent-id>",
    "query": "memory persistence on Vercel",
    "tags": ["vercel"],
    "metadataFilters": {
      "workspaceId": "external-claw-test"
    },
    "limit": 5
  }'
```

## Session Testing

Create a session:

```bash
curl -X POST https://agent-memory-five.vercel.app/v1/sessions \
  -H 'content-type: application/json' \
  -d '{
    "agentId": "<agent-id>",
    "channel": "claw",
    "externalId": "test-session-001",
    "metadata": {
      "workspaceId": "external-claw-test",
      "threadId": "thread-001"
    }
  }'
```

Then store memories with `sessionId` and verify that session-related workflows behave as expected.

## Claw Event Testing

You can also test event ingestion directly.

Endpoint:

- POST /v1/claw/events

Example:

```bash
curl -X POST https://agent-memory-five.vercel.app/v1/claw/events \
  -H 'content-type: application/json' \
  -d '{
    "agentId": "<agent-id>",
    "session": {
      "id": "session-test-01",
      "channel": "claw",
      "workspaceId": "external-claw-test",
      "threadId": "thread-001",
      "userId": "tester-01"
    },
    "event": {
      "kind": "tool_result",
      "actor": "tool",
      "intent": "search_docs",
      "action": "lookup",
      "toolName": "memory-search",
      "outcome": "success",
      "content": "Found 3 matching documents.",
      "metadata": {
        "provider": "external-claw"
      }
    }
  }'
```

## Claw Context Testing

Endpoint:

- POST /v1/claw/context

Use this to verify whether stored memories are being turned into useful context for your agent.

## MCP Testing

If your client supports MCP over HTTP, test against:

- POST https://agent-memory-five.vercel.app/v1/mcp
- GET https://agent-memory-five.vercel.app/v1/mcp

Suggested checks:

- session creation
- repeated calls with the same session
- event streaming behavior
- tool interoperability
- reconnection behavior

## Important Notes

- This deployment is intended for testing.
- Anonymous traffic currently shares one public agent.
- Do not send secrets, credentials, or sensitive user data.
- Recall quality is hybrid and may include vector, metadata, tag, and text matching behavior.

## What to Report

If you find issues, please report:

1. What client/agent you used
2. Which endpoint you called
3. Request payload shape (remove secrets)
4. Expected behavior
5. Actual behavior
6. HTTP status code
7. Response body
8. Whether the issue is reproducible

Suggested report format:

```text
Client:
Endpoint:
Test scenario:
Expected result:
Actual result:
HTTP status:
Response body:
Steps to reproduce:
Additional notes:
```

## Minimum Smoke Test Checklist

- [ ] `/health` returns 200
- [ ] `/v1/agents/me` returns an agent
- [ ] memory write succeeds
- [ ] memory recall returns expected content
- [ ] session creation succeeds
- [ ] Claw event ingestion succeeds
- [ ] MCP endpoint is reachable

## Contact / Handoff Note

If you are receiving this document, you are being asked to test interoperability and behavior from a real Claw agent/client environment.

Please focus on:

- integration friction
- missing fields or assumptions
- MCP compatibility problems
- recall quality problems
- session lifecycle issues
- any behavior that would block real agent usage
