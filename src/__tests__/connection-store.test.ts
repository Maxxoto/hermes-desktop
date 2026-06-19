/**
 * connection-store.test.ts — Unit tests for the Zustand connection store
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useConnectionStore } from "../features/connection/connection-store";

describe("connection-store", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useConnectionStore.getState().clear();
  });

  it("has initial empty state", () => {
    const state = useConnectionStore.getState();
    expect(state.gatewayUrl).toBe("");
    expect(state.apiKey).toBe("");
    expect(state.isConfigured).toBe(false);
  });

  describe("setCredentials()", () => {
    it("stores url and key", () => {
      useConnectionStore
        .getState()
        .setCredentials("http://localhost:8642", "my-api-key");

      const state = useConnectionStore.getState();
      expect(state.gatewayUrl).toBe("http://localhost:8642");
      expect(state.apiKey).toBe("my-api-key");
      expect(state.isConfigured).toBe(true);
    });

    it("overwrites previous credentials", () => {
      const { setCredentials } = useConnectionStore.getState();
      setCredentials("http://first:8642", "key1");
      setCredentials("http://second:8642", "key2");

      const state = useConnectionStore.getState();
      expect(state.gatewayUrl).toBe("http://second:8642");
      expect(state.apiKey).toBe("key2");
    });
  });

  describe("clear()", () => {
    it("resets to empty state", () => {
      useConnectionStore
        .getState()
        .setCredentials("http://localhost:8642", "key");

      useConnectionStore.getState().clear();

      const state = useConnectionStore.getState();
      expect(state.gatewayUrl).toBe("");
      expect(state.apiKey).toBe("");
      expect(state.isConfigured).toBe(false);
    });

    it("can be called when already clear (idempotent)", () => {
      useConnectionStore.getState().clear();
      useConnectionStore.getState().clear();

      const state = useConnectionStore.getState();
      expect(state.isConfigured).toBe(false);
    });
  });

  describe("isConfigured flag", () => {
    it("is false initially", () => {
      expect(useConnectionStore.getState().isConfigured).toBe(false);
    });

    it("becomes true after setCredentials", () => {
      useConnectionStore.getState().setCredentials("http://x", "k");
      expect(useConnectionStore.getState().isConfigured).toBe(true);
    });

    it("becomes false after clear", () => {
      useConnectionStore.getState().setCredentials("http://x", "k");
      useConnectionStore.getState().clear();
      expect(useConnectionStore.getState().isConfigured).toBe(false);
    });
  });
});

describe("getGatewayClient() factory", () => {
  it("throws when credentials not set", async () => {
    useConnectionStore.getState().clear();
    const { getGatewayClient } = await import(
      "../features/connection/gateway-api"
    );

    expect(() => getGatewayClient()).toThrow("Gateway not configured");
  });

  it("returns a GatewayClient when credentials are set", async () => {
    useConnectionStore
      .getState()
      .setCredentials("http://localhost:8642", "test-key");
    const { getGatewayClient } = await import(
      "../features/connection/gateway-api"
    );

    const client = getGatewayClient();
    expect(client).toBeDefined();
    expect(typeof client.listSessions).toBe("function");
    expect(typeof client.health).toBe("function");
  });
});
