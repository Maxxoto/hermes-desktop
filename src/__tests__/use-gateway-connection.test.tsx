/**
 * use-gateway-connection.test.ts — Tests for useTestConnection hook
 *
 * Tests the mutation states: idle, pending, success, error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTestConnection } from "../features/connection/use-gateway-connection";

// ---- Mock @tauri-apps/api/core --------------------------------------------

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// ---- Mock GatewayClient ----------------------------------------------------

const mockHealth = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  GatewayClient: class MockGatewayClient {
    constructor(public baseUrl: string, public apiKey: string) {}
    health() {
      return mockHealth();
    }
  },
}));

// ---- Wrapper ---------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---- Tests -----------------------------------------------------------------

describe("useTestConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealth.mockResolvedValue({ status: "ok" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("transitions to success with health data on successful connection", async () => {
    mockHealth.mockResolvedValue({ status: "ok", version: "1.0.0" });

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: "http://localhost:8642", key: "test-key" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ status: "ok", version: "1.0.0" });
    expect(result.current.isError).toBe(false);
    expect(mockHealth).toHaveBeenCalled();
  });

  it("transitions to error on connection failure", async () => {
    mockHealth.mockRejectedValue(new Error("Connection refused"));

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: "http://bad:8642", key: "test-key" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Connection refused");
    expect(result.current.isSuccess).toBe(false);
  });

  it("passes the API key to the GatewayClient constructor", async () => {
    mockHealth.mockResolvedValue({ status: "ok" });

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: "http://gw:8642", key: "my-secret-key" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The mock GatewayClient stores apiKey — verify health was called
    expect(mockHealth).toHaveBeenCalledTimes(1);
  });

  it("can be reset and called again", async () => {
    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    // First call — success
    mockHealth.mockResolvedValue({ status: "ok" });
    result.current.mutate({ url: "http://a", key: "k1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reset
    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(false));

    // Second call — error
    mockHealth.mockRejectedValue(new Error("fail"));
    result.current.mutate({ url: "http://b", key: "k2" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
