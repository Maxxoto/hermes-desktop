/**
 * use-gateway-health.test.ts — Tests for useGatewayHealth hook
 *
 * Tests health check states (connected/disconnected), getBackoffInterval
 * calculation, and failure/recovery tracking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useGatewayHealth,
  getBackoffInterval,
} from "../features/status/use-gateway-health";

// ---- Mock getGatewayClient ------------------------------------------------

const mockHealth = vi.fn();
const mockHealthDetailed = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    health: (...args: unknown[]) => mockHealth(...args),
    healthDetailed: (...args: unknown[]) => mockHealthDetailed(...args),
  }),
}));

// ---- Wrapper ---------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchInterval: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---- Tests -----------------------------------------------------------------

describe("getBackoffInterval", () => {
  it("returns 5000ms (BASE) for 0 failures", () => {
    expect(getBackoffInterval(0)).toBe(5_000);
  });

  it("returns 5000ms for negative failure count", () => {
    expect(getBackoffInterval(-1)).toBe(5_000);
  });

  it("returns 10000ms for 1 failure", () => {
    expect(getBackoffInterval(1)).toBe(10_000);
  });

  it("returns 20000ms for 2 failures", () => {
    expect(getBackoffInterval(2)).toBe(20_000);
  });

  it("returns 40000ms for 3 failures", () => {
    expect(getBackoffInterval(3)).toBe(40_000);
  });

  it("returns 60000ms (MAX cap) for 4+ failures", () => {
    expect(getBackoffInterval(4)).toBe(60_000);
    expect(getBackoffInterval(5)).toBe(60_000);
    expect(getBackoffInterval(100)).toBe(60_000);
  });

  it("follows exponential pattern (5s * 2^n)", () => {
    expect(getBackoffInterval(1)).toBe(5_000 * 2);
    expect(getBackoffInterval(2)).toBe(5_000 * 4);
    expect(getBackoffInterval(3)).toBe(5_000 * 8);
  });
});

describe("useGatewayHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealth.mockResolvedValue({ status: "ok" });
    mockHealthDetailed.mockResolvedValue({
      status: "ok",
      version: "1.0.0",
      sessions_active: 3,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health data on successful fetch", async () => {
    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      status: "ok",
      activeSessions: 3,
      version: "1.0.0",
    });
  });

  it("sets isError on fetch failure", async () => {
    mockHealth.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it("handles healthDetailed failure gracefully (defaults to 0 sessions)", async () => {
    mockHealth.mockResolvedValue({ status: "ok" });
    mockHealthDetailed.mockRejectedValue(new Error("detailed endpoint missing"));

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      status: "ok",
      activeSessions: 0,
      version: "?",
    });
  });

  it("starts with isLoading true before first fetch resolves", () => {
    mockHealth.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("resets failureCount on recovery", async () => {
    // First fetch fails
    mockHealth.mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // After a failure, failureCount should be > 0
    expect(result.current.failureCount).toBeGreaterThan(0);

    // Refetch — this time succeed
    mockHealth.mockResolvedValue({ status: "ok" });
    mockHealthDetailed.mockResolvedValue({
      status: "ok",
      version: "1.0",
      sessions_active: 1,
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.failureCount).toBe(0);
    });
  });

  it("detects unhealthy status (not 'ok' or 'healthy')", async () => {
    mockHealth.mockResolvedValue({ status: "degraded" });
    mockHealthDetailed.mockResolvedValue({
      status: "degraded",
      version: "1.0",
      sessions_active: 0,
    });

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have incremented failureCount because status is unhealthy
    expect(result.current.failureCount).toBeGreaterThan(0);
  });

  it("accepts 'healthy' as a healthy status", async () => {
    mockHealth.mockResolvedValue({ status: "healthy" });
    mockHealthDetailed.mockResolvedValue({
      status: "healthy",
      version: "2.0",
      sessions_active: 5,
    });

    const { result } = renderHook(() => useGatewayHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.failureCount).toBe(0);
  });
});
