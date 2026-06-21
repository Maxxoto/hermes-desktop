/**
 * screen-share-api.test.ts — Tests for Gateway API image attachment support
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GatewayClient,
} from "../features/connection/gateway-api";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createClient() {
  return new GatewayClient("http://localhost:8080", "test-key");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GatewayClient.chatStream with images", () => {
  it("sends images array in request body when provided", async () => {
    const client = createClient();

    // Mock SSE response
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "event: assistant.delta\ndata: {\"delta\": \"Hello\"}\n\n",
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            "event: assistant.completed\ndata: {\"content\": \"Hello world\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    const images = ["data:image/png;base64,abc123"];

    await client.chatStream("session-1", "What do you see?", onEvent, {
      images,
    });

    // Verify fetch was called with correct body
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.message).toBe("What do you see?");
    expect(body.images).toEqual([
      {
        type: "image",
        data: "data:image/png;base64,abc123",
        mime_type: "image/png",
      },
    ]);
  });

  it("does not include images when not provided", async () => {
    const client = createClient();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "event: assistant.completed\ndata: {\"content\": \"OK\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    await client.chatStream("session-1", "Hello", onEvent);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.message).toBe("Hello");
    expect(body.images).toBeUndefined();
  });

  it("sends multiple images", async () => {
    const client = createClient();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "event: assistant.completed\ndata: {\"content\": \"OK\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    const images = [
      "data:image/png;base64,first",
      "data:image/png;base64,second",
    ];

    await client.chatStream("session-1", "Compare these", onEvent, { images });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.images).toHaveLength(2);
    expect(body.images[0].data).toBe("data:image/png;base64,first");
    expect(body.images[1].data).toBe("data:image/png;base64,second");
  });

  it("sends empty images array as no images field", async () => {
    const client = createClient();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "event: assistant.completed\ndata: {\"content\": \"OK\"}\n\n",
          ),
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    await client.chatStream("session-1", "Hello", onEvent, { images: [] });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.images).toBeUndefined();
  });
});
