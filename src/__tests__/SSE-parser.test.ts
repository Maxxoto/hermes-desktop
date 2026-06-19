/**
 * SSE-parser.test.ts — Tests for the SSE event parser
 *
 * We test the private parseSSEEvent / mapSSEEvent methods by importing
 * the GatewayClient and using a thin adapter, OR we can reconstruct the
 * parsing logic since it's private.  The cleanest approach: exercise the
 * parsing through chatStream with a mocked fetch that returns SSE bytes.
 *
 * However, since the parser is private, we'll test via a public surface:
 * we mock fetch to return SSE data and verify the events that reach onEvent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { GatewayClient } from "../features/connection/gateway-api";
import type { GatewayEvent } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake ReadableStream that yields one Uint8Array chunk containing
 * the given SSE text.
 */
function sseStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function mockFetchSSE(sseBody: string) {
  vi.stubGlobal(
    "fetch",
    () =>
      Promise.resolve(
        new Response(sseStream(sseBody), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
  );
}

function restoreFetch() {
  vi.restoreAllMocks();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SSE Parser (via GatewayClient.chatStream)", () => {
  const client = new GatewayClient("http://localhost:1420", "test-key");

  afterEach(() => {
    restoreFetch();
  });

  it("parses assistant.delta event", async () => {
    mockFetchSSE(
      'event: assistant.delta\ndata: {"delta":"Hello world"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "assistant.delta", delta: "Hello world" });
  });

  it("parses multiple assistant.delta events", async () => {
    mockFetchSSE(
      'event: assistant.delta\ndata: {"delta":"Hello"}\n\n' +
      'event: assistant.delta\ndata: {"delta":" world"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "assistant.delta", delta: "Hello" });
    expect(events[1]).toEqual({ type: "assistant.delta", delta: " world" });
  });

  it("parses tool.started event with tool_name and dict args", async () => {
    mockFetchSSE(
      'event: tool.started\ndata: {"tool_name":"web_search","args":{"query":"weather"}}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "tool.started",
      tool: "web_search",
      args: '{"query":"weather"}',
    });
  });

  it("parses tool.started with string args", async () => {
    mockFetchSSE(
      'event: tool.started\ndata: {"tool_name":"calculator","args":"1+2"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events[0]).toEqual({
      type: "tool.started",
      tool: "calculator",
      args: "1+2",
    });
  });

  it("parses tool.started with no args", async () => {
    mockFetchSSE(
      'event: tool.started\ndata: {"tool_name":"noop"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events[0]).toEqual({
      type: "tool.started",
      tool: "noop",
      args: undefined,
    });
  });

  it("parses tool.completed event", async () => {
    mockFetchSSE(
      'event: tool.completed\ndata: {"tool_name":"web_search"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "tool.completed", tool: "web_search" });
  });

  it("parses assistant.completed → maps to run.completed", async () => {
    mockFetchSSE(
      'event: assistant.completed\ndata: {"content":"The answer is 42."}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "run.completed",
      content: "The answer is 42.",
    });
  });

  it("parses run.completed with messages array", async () => {
    mockFetchSSE(
      'event: run.completed\ndata: {"messages":[{"content":"From messages array"}]}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "run.completed",
      content: "From messages array",
    });
  });

  it("parses run.completed with top-level content (no messages)", async () => {
    mockFetchSSE(
      'event: run.completed\ndata: {"content":"Direct content"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "run.completed",
      content: "Direct content",
    });
  });

  it("parses run.error event", async () => {
    mockFetchSSE(
      'event: run.error\ndata: {"error":"Rate limit exceeded"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "run.error",
      error: "Rate limit exceeded",
    });
  });

  it("parses run.error with message field as fallback", async () => {
    mockFetchSSE(
      'event: run.error\ndata: {"message":"Something broke"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events[0]).toEqual({
      type: "run.error",
      error: "Something broke",
    });
  });

  it("ignores tool.progress events", async () => {
    mockFetchSSE(
      'event: tool.progress\ndata: {"progress":50}\n\n' +
      'event: assistant.delta\ndata: {"delta":"result"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("assistant.delta");
  });

  it("ignores run.started events", async () => {
    mockFetchSSE(
      'event: run.started\ndata: {"run_id":"r1"}\n\n' +
      'event: assistant.delta\ndata: {"delta":"ok"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("assistant.delta");
  });

  it("ignores done events", async () => {
    mockFetchSSE(
      'event: done\ndata: {}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(0);
  });

  it("ignores message.started events", async () => {
    mockFetchSSE(
      'event: message.started\ndata: {"id":"m1"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(0);
  });

  it("handles malformed JSON gracefully (returns null, skips event)", async () => {
    mockFetchSSE(
      'event: assistant.delta\ndata: {this is not json}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(0);
  });

  it("handles missing event line (skips the event)", async () => {
    // data-only chunk with no event: line — falls through to default → null
    mockFetchSSE('data: {"delta":"orphan"}\n\n');

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    // eventType will be "" which hits default → null
    expect(events).toHaveLength(0);
  });

  it("handles data line without space after colon", async () => {
    // The parser handles "data:" (no space) as well as "data: " (with space)
    mockFetchSSE(
      'event: assistant.delta\ndata:{"delta":"no space"}\n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "assistant.delta",
      delta: "no space",
    });
  });

  it("handles empty data line gracefully", async () => {
    // Data line with no actual content
    mockFetchSSE(
      'event: assistant.delta\ndata: \n\n',
    );

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "hi", (e) => events.push(e));

    expect(events).toHaveLength(0);
  });

  it("parses a full realistic SSE stream", async () => {
    const stream = [
      'event: run.started\ndata: {"run_id":"run_001"}\n\n',
      'event: message.started\ndata: {"id":"msg_001"}\n\n',
      'event: assistant.delta\ndata: {"delta":"I"}\n\n',
      'event: assistant.delta\ndata: {"delta":" can"}\n\n',
      'event: assistant.delta\ndata: {"delta":" help."}\n\n',
      'event: tool.started\ndata: {"tool_name":"calculator","args":{"expr":"2+2"}}\n\n',
      'event: tool.completed\ndata: {"tool_name":"calculator"}\n\n',
      'event: assistant.delta\ndata: {"delta":" The answer is 4."}\n\n',
      'event: assistant.completed\ndata: {"content":"I can help. The answer is 4."}\n\n',
      'event: done\ndata: {}\n\n',
    ].join("");

    mockFetchSSE(stream);

    const events: GatewayEvent[] = [];
    await client.chatStream("sess1", "What is 2+2?", (e) => events.push(e));

    // Filter out null events — only the meaningful ones reach onEvent
    expect(events.length).toBeGreaterThan(0);

    const types = events.map((e) => e.type);
    expect(types).toContain("assistant.delta");
    expect(types).toContain("tool.started");
    expect(types).toContain("tool.completed");
    expect(types).toContain("run.completed");

    // Should NOT contain run.started, message.started, done
    expect(types).not.toContain("run.started");
    expect(types).not.toContain("message.started");
    expect(types).not.toContain("done");

    // Final event should be run.completed from assistant.completed
    const lastEvent = events[events.length - 1];
    expect(lastEvent).toEqual({
      type: "run.completed",
      content: "I can help. The answer is 4.",
    });
  });
});
