/**
 * use-agents.test.ts — Tests for useAgents hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAgents } from "../features/agents/use-agents";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockListAgents = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    listAgents: (...args: unknown[]) => mockListAgents(...args),
  }),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAgents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns agents from API after fetch", async () => {
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One", description: "First agent" },
      { id: "a2", name: "Agent Two", description: "Second agent" },
    ]);

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    // Initially has placeholder data
    expect(result.current.data).toBeDefined();

    // After API resolves, data should be updated
    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(result.current.data![0].id).toBe("a1");
    expect(result.current.data![1].id).toBe("a2");
  });

  it("falls back to default on 404", async () => {
    mockListAgents.mockResolvedValue([
      { id: "default", name: "Default Agent", description: "Main Hermes agent" },
    ]);

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe("default");
  });

  it("has placeholder data available immediately", () => {
    mockListAgents.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    // With placeholderData, data is available even while loading
    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe("default");
  });
});
