/**
 * use-sessions.test.tsx — Tests for mutation hooks + extractTitle
 *
 * Tests the pure extractTitle function and the React Query mutation hooks
 * (useRenameSession, useDeleteSession, useAutoTitle) with mocked fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  extractTitle,
  useRenameSession,
  useDeleteSession,
  useAutoTitle,
} from "../features/sessions/use-sessions";
import type { Session } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Mock QueryClient wrapper
// ---------------------------------------------------------------------------

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

// ---------------------------------------------------------------------------
// Mock gateway client
// ---------------------------------------------------------------------------

const mockPatchSession = vi.fn();
const mockDeleteSession = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    patchSession: (...args: unknown[]) => mockPatchSession(...args),
    deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
    listSessions: vi.fn(),
    getSessionMessages: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION: Session = {
  id: "test_001",
  title: "Original Title",
  source: "cli",
  model: "hermes-3",
  message_count: 2,
  started_at: 1718000000,
  last_active: 1718001000,
};

// ---------------------------------------------------------------------------
// extractTitle tests
// ---------------------------------------------------------------------------

describe("extractTitle", () => {
  it("returns short messages unchanged", () => {
    expect(extractTitle("Hello")).toBe("Hello");
  });

  it("returns exactly 50 chars unchanged", () => {
    const msg = "a".repeat(50);
    expect(extractTitle(msg)).toBe(msg);
  });

  it("truncates long messages with ellipsis at word boundary", () => {
    const msg = "This is a relatively long first message that should be truncated at word boundary";
    const result = extractTitle(msg);
    expect(result.length).toBeLessThanOrEqual(51); // word + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("truncates long messages with no spaces near boundary", () => {
    const msg = "a".repeat(60);
    const result = extractTitle(msg);
    expect(result).toBe("a".repeat(50) + "…");
  });

  it("collapses newlines into spaces", () => {
    expect(extractTitle("Hello\n\nworld")).toBe("Hello world");
  });

  it("trims leading/trailing whitespace", () => {
    expect(extractTitle("   Hello world   ")).toBe("Hello world");
  });

  it("handles empty string", () => {
    expect(extractTitle("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// useRenameSession tests
// ---------------------------------------------------------------------------

describe("useRenameSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls patchSession with id and title", async () => {
    mockPatchSession.mockResolvedValue({ ...SESSION, title: "New Title" });
    const { result } = renderHook(() => useRenameSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "test_001", title: "New Title" });

    await waitFor(() => {
      expect(mockPatchSession).toHaveBeenCalledWith("test_001", {
        title: "New Title",
      });
    });
  });

  it("handles patchSession error gracefully", async () => {
    mockPatchSession.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useRenameSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "test_001", title: "New Title" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// useDeleteSession tests
// ---------------------------------------------------------------------------

describe("useDeleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls deleteSession with id", async () => {
    mockDeleteSession.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("test_001");

    await waitFor(() => {
      expect(mockDeleteSession).toHaveBeenCalledWith("test_001");
    });
  });

  it("handles delete error gracefully", async () => {
    mockDeleteSession.mockRejectedValue(new Error("Not found"));
    const { result } = renderHook(() => useDeleteSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("test_001");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// useAutoTitle tests
// ---------------------------------------------------------------------------

describe("useAutoTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls patchSession with extracted title from message", async () => {
    const patched = { ...SESSION, title: "Hello world" };
    mockPatchSession.mockResolvedValue(patched);
    const { result } = renderHook(() => useAutoTitle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "test_001", message: "Hello world how are you" });

    await waitFor(() => {
      expect(mockPatchSession).toHaveBeenCalledWith("test_001", {
        title: "Hello world how are you",
      });
    });
  });

  it("truncates long messages when creating title", async () => {
    const longMsg = "This is a very long message that definitely exceeds the fifty character limit for titles";
    mockPatchSession.mockResolvedValue({ ...SESSION });
    const { result } = renderHook(() => useAutoTitle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "test_001", message: longMsg });

    await waitFor(() => {
      const callArg = mockPatchSession.mock.calls[0][1];
      expect(callArg.title.length).toBeLessThanOrEqual(51);
      expect(callArg.title.endsWith("…")).toBe(true);
    });
  });
});
