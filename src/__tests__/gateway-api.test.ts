/**
 * gateway-api.test.ts — Unit tests for GatewayClient
 *
 * All fetch calls are mocked — no network needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GatewayClient,
  GatewayClientError,
} from "../features/connection/gateway-api";
import type { Session, SessionMessage } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, text = "error"): Response {
  return new Response(text, { status, statusText: text });
}

function mockFetch(returnValue: Response | (() => Promise<Response>)) {
  const fn =
    typeof returnValue === "function"
      ? returnValue
      : () => Promise.resolve(returnValue);
  vi.stubGlobal("fetch", fn);
}

function restoreFetch() {
  vi.restoreAllMocks();
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION_A: Session = {
  id: "test_a1",
  title: "Test Session A",
  source: "cli",
  model: "hermes-3",
  message_count: 3,
  started_at: 1718000000,
  last_active: 1718001000,
  user_id: "u1",
  preview: "Hello world",
};

const SESSION_B: Session = {
  id: "test_b2",
  title: "Test Session B",
  source: "web",
  model: "hermes-3",
  message_count: 1,
  started_at: 1717900000,
  last_active: 1717901000,
};

const MESSAGE_A: SessionMessage = {
  id: "msg_001",
  session_id: "test_a1",
  role: "assistant",
  content: "I can help with that.",
  timestamp: 1718000500,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GatewayClient", () => {
  let client: GatewayClient;

  beforeEach(() => {
    client = new GatewayClient("http://localhost:1420", "hm-desk-v1-2026");
  });

  afterEach(() => {
    restoreFetch();
  });

  // ---- listSessions ------------------------------------------------------

  describe("listSessions()", () => {
    it("returns unwrapped Session[]", async () => {
      mockFetch(
        jsonResponse({
          object: "list",
          data: [SESSION_A, SESSION_B],
          limit: 100,
          offset: 0,
          has_more: false,
        }),
      );

      const sessions = await client.listSessions();

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe("test_a1");
      expect(sessions[1].id).toBe("test_b2");
    });

    it("sends limit and offset query params", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(jsonResponse({ object: "list", data: [] })),
      );
      mockFetch(fetchSpy);

      await client.listSessions(50, 10);

      const firstCall = fetchSpy.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const url = new URL(firstCall[0]);
      expect(url.searchParams.get("limit")).toBe("50");
      expect(url.searchParams.get("offset")).toBe("10");
    });

    it("returns empty array when data is missing", async () => {
      mockFetch(jsonResponse({ object: "list" }));

      const sessions = await client.listSessions();
      expect(sessions).toEqual([]);
    });
  });

  // ---- createSession -----------------------------------------------------

  describe("createSession()", () => {
    it("sends POST with body and unwraps .session", async () => {
      mockFetch(
        jsonResponse({ object: "hermes.session", session: SESSION_A }),
      );

      const session = await client.createSession("My Title");

      expect(session.id).toBe("test_a1");
      expect(session.title).toBe("Test Session A");
    });

    it("sends empty object body when no title", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(
          jsonResponse({ object: "hermes.session", session: SESSION_A }),
        ),
      );
      mockFetch(fetchSpy);

      await client.createSession();

      const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(firstCall[1].body as string);
      expect(body).toEqual({});
    });

    it("sends title in body when provided", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(
          jsonResponse({ object: "hermes.session", session: SESSION_A }),
        ),
      );
      mockFetch(fetchSpy);

      await client.createSession("Hello");

      const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(firstCall[1].body as string);
      expect(body).toEqual({ title: "Hello" });
    });
  });

  // ---- getSessionMessages ------------------------------------------------

  describe("getSessionMessages()", () => {
    it("unwraps .data from messages list response", async () => {
      mockFetch(
        jsonResponse({
          object: "messages",
          session_id: "test_a1",
          data: [MESSAGE_A],
        }),
      );

      const messages = await client.getSessionMessages("test_a1");

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("I can help with that.");
    });

    it("sends limit query param", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(jsonResponse({ object: "messages", data: [] })),
      );
      mockFetch(fetchSpy);

      await client.getSessionMessages("test_a1", 25);

      const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const url = new URL(firstCall[0]);
      expect(url.searchParams.get("limit")).toBe("25");
    });

    it("returns empty array when data is missing", async () => {
      mockFetch(jsonResponse({ object: "messages", session_id: "test_a1" }));

      const messages = await client.getSessionMessages("test_a1");
      expect(messages).toEqual([]);
    });
  });

  // ---- patchSession ------------------------------------------------------

  describe("patchSession()", () => {
    it("sends PATCH and unwraps .session", async () => {
      const patched = { ...SESSION_A, title: "Updated Title" };
      mockFetch(
        jsonResponse({ object: "hermes.session", session: patched }),
      );

      const result = await client.patchSession("test_a1", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
      expect(result.id).toBe("test_a1");
    });
  });

  // ---- forkSession -------------------------------------------------------

  describe("forkSession()", () => {
    it("sends {} body and returns { id }", async () => {
      mockFetch(
        jsonResponse({
          object: "hermes.session",
          session: { ...SESSION_A, id: "fork_123" },
        }),
      );

      const result = await client.forkSession("test_a1");

      expect(result).toEqual({ id: "fork_123" });
    });

    it("includes message_index when provided", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            object: "hermes.session",
            session: { ...SESSION_A, id: "fork_456" },
          }),
        ),
      );
      mockFetch(fetchSpy);

      await client.forkSession("test_a1", 3);

      const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(firstCall[1].body as string);
      expect(body).toEqual({ message_index: 3 });
    });
  });

  // ---- deleteSession -----------------------------------------------------

  describe("deleteSession()", () => {
    it("sends DELETE and resolves", async () => {
      mockFetch(jsonResponse({ deleted: true }));

      await expect(client.deleteSession("test_a1")).resolves.toBeUndefined();
    });

    it("throws GatewayClientError on failure", async () => {
      mockFetch(errorResponse(404, "not found"));

      await expect(client.deleteSession("nonexistent")).rejects.toThrow(
        GatewayClientError,
      );
    });
  });

  // ---- health ------------------------------------------------------------

  describe("health()", () => {
    it("returns HealthResponse", async () => {
      mockFetch(jsonResponse({ status: "ok", version: "1.0.0" }));

      const health = await client.health();

      expect(health.status).toBe("ok");
      expect(health.version).toBe("1.0.0");
    });
  });

  // ---- error handling ----------------------------------------------------

  describe("error handling", () => {
    it("throws GatewayClientError on HTTP 401", async () => {
      mockFetch(errorResponse(401, "Unauthorized"));

      await expect(client.listSessions()).rejects.toThrow(GatewayClientError);
      await expect(client.listSessions()).rejects.toMatchObject({
        status: 401,
      });
    });

    it("throws GatewayClientError on HTTP 500", async () => {
      mockFetch(errorResponse(500, "Internal Server Error"));

      await expect(client.createSession()).rejects.toThrow(
        GatewayClientError,
      );
    });

    it("GatewayClientError has correct name", async () => {
      mockFetch(errorResponse(403, "forbidden"));

      try {
        await client.listSessions();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(GatewayClientError);
        expect((err as GatewayClientError).name).toBe("GatewayClientError");
      }
    });

    it("strips trailing slash from baseUrl", () => {
      const c = new GatewayClient("http://localhost:1420/", "key");
      // The trailing slash should be removed
      const internal = c as unknown as { baseUrl: string };
      expect(internal.baseUrl).toBe("http://localhost:1420");
    });
  });

  // ---- request helpers ---------------------------------------------------

  describe("request helpers", () => {
    it("sends Authorization header", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(jsonResponse({ status: "ok" })),
      );
      mockFetch(fetchSpy);

      await client.health();

      const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const headers = firstCall[1].headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer hm-desk-v1-2026");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("sends correct HTTP method", async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve(jsonResponse({ status: "ok" })),
      );
      mockFetch(fetchSpy);

      await client.listSessions();
      const call0 = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      expect(call0[1].method).toBe("GET");

      await client.createSession();
      const call1 = fetchSpy.mock.calls[1] as unknown as [string, RequestInit];
      expect(call1[1].method).toBe("POST");

      await client.patchSession("x", { title: "t" });
      const call2 = fetchSpy.mock.calls[2] as unknown as [string, RequestInit];
      expect(call2[1].method).toBe("PATCH");

      await client.deleteSession("x");
      const call3 = fetchSpy.mock.calls[3] as unknown as [string, RequestInit];
      expect(call3[1].method).toBe("DELETE");
    });
  });
});
