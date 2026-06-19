/**
 * gateway-api-integration.test.ts — Integration tests against the live Hermes Gateway
 *
 * REQUIREMENTS:
 *   - Vite dev server running on port 1420 (npm run dev)
 *   - Gateway proxy forwarding /api/* → localhost:8642
 *   - API key: hm-desk-v1-2026
 *
 * All test sessions are prefixed with "test_" for easy cleanup.
 * afterAll deletes every test_ session it created.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  GatewayClient,
  GatewayClientError,
} from "../features/connection/gateway-api";
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:1420";
const API_KEY = "hm-desk-v1-2026";
const client = new GatewayClient(BASE_URL, API_KEY);

// Track created sessions for cleanup
const createdSessionIds: string[] = [];
const createdForkIds: string[] = [];

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Verify gateway is reachable
  try {
    const health = await client.health();
    expect(health.status).toBe("ok");
  } catch (err) {
    console.error(
      "❌ Gateway not reachable at " +
        BASE_URL +
        ". Start Vite dev server first: npm run dev",
    );
    throw err;
  }
});

afterAll(async () => {
  // Delete all sessions created during tests
  for (const id of createdSessionIds) {
    try {
      await client.deleteSession(id);
    } catch {
      // ignore — may already be deleted
    }
  }
  for (const id of createdForkIds) {
    try {
      await client.deleteSession(id);
    } catch {
      // ignore
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration: Gateway Health", () => {
  it("GET /health returns ok", async () => {
    const health = await client.health();
    expect(health.status).toBe("ok");
  });
});

describe("Integration: Session CRUD", () => {
  let sessionId: string;

  it("create session returns Session with id", async () => {
    const session = await client.createSession("test_integration_crud");
    createdSessionIds.push(session.id);
    sessionId = session.id;

    expect(session.id).toBeTruthy();
    expect(session.title).toBe("test_integration_crud");
    expect(typeof session.message_count).toBe("number");
    expect(typeof session.started_at).toBe("number");
  });

  it("list sessions includes the created session", async () => {
    const sessions = await client.listSessions(100);

    expect(Array.isArray(sessions)).toBe(true);
    const found = sessions.find((s) => s.id === sessionId);
    expect(found).toBeDefined();
    expect(found!.title).toBe("test_integration_crud");
  });

  it("patch session updates the title", async () => {
    const patched = await client.patchSession(sessionId, {
      title: "test_integration_patched",
    });

    expect(patched.id).toBe(sessionId);
    expect(patched.title).toBe("test_integration_patched");
  });

  it("get messages returns empty array for new session", async () => {
    const messages = await client.getSessionMessages(sessionId);

    expect(Array.isArray(messages)).toBe(true);
    // New session has no messages
    expect(messages.length).toBe(0);
  });
});

describe("Integration: Session Fork", () => {
  let originalId: string;
  let forkId: string;

  it("create session then fork it", async () => {
    const session = await client.createSession("test_integration_fork_src");
    originalId = session.id;
    createdSessionIds.push(originalId);

    const fork = await client.forkSession(originalId);
    forkId = fork.id;
    createdForkIds.push(forkId);

    expect(fork.id).toBeTruthy();
    expect(fork.id).not.toBe(originalId);
  });

  it("fork appears in session list", async () => {
    const sessions = await client.listSessions(200);
    const found = sessions.find((s) => s.id === forkId);
    expect(found).toBeDefined();
  });
});

describe("Integration: Chat Stream", () => {
  it("receives at least one event from a chat stream", async () => {
    const session = await client.createSession("test_integration_stream");
    createdSessionIds.push(session.id);

    const events: unknown[] = [];

    // Send a short message — we just need to verify SSE plumbing works
    try {
      await client.chatStream(
        session.id,
        "Say 'test ok' and nothing else",
        (e) => {
          events.push(e);
        },
      );
    } catch {
      // Stream may error if model is unavailable — that's ok, we just want
      // to verify the SSE plumbing works. If we got at least one event, pass.
    }

    // We should have received some events (at minimum a delta or completed)
    expect(events.length).toBeGreaterThan(0);
  }, 30_000); // generous timeout for streaming
});

describe("Integration: Error Handling", () => {
  it("invalid API key returns 401", async () => {
    const badClient = new GatewayClient(BASE_URL, "invalid-key-12345");

    await expect(badClient.listSessions()).rejects.toThrow(GatewayClientError);

    try {
      await badClient.listSessions();
    } catch (err) {
      expect((err as GatewayClientError).status).toBe(401);
    }
  });
});
