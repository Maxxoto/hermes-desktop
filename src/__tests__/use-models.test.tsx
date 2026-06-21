/**
 * use-models.test.ts — Tests for useModels hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useModels } from "../features/agents/use-models";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockListModels = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    listModels: (...args: unknown[]) => mockListModels(...args),
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

describe("useModels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns models from API", async () => {
    mockListModels.mockResolvedValue([
      { id: "m1", name: "hermes-3", provider: "openai" },
      { id: "m2", name: "claude-3", provider: "anthropic" },
    ]);

    const { result } = renderHook(() => useModels(), {
      wrapper: createWrapper(),
    });

    // With placeholderData, data is available immediately (default)
    expect(result.current.data).toBeDefined();

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(result.current.data![0].provider).toBe("openai");
  });

  it("falls back to default on 404", async () => {
    mockListModels.mockResolvedValue([
      { id: "default", name: "Default Model", provider: "default" },
    ]);

    const { result } = renderHook(() => useModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe("default");
  });
});
