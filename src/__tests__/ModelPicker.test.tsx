/**
 * ModelPicker.test.tsx — Tests for ModelPicker component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModelPicker from "../features/agents/ModelPicker";

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

describe("ModelPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders compact label when 1 model", async () => {
    mockListModels.mockResolvedValue([
      { id: "default", name: "Default Model", provider: "default" },
    ]);

    render(<ModelPicker value={null} onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Default Model")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Select model")).not.toBeInTheDocument();
  });

  it("renders grouped dropdown when multiple models", async () => {
    mockListModels.mockResolvedValue([
      { id: "m1", name: "hermes-3", provider: "openai" },
      { id: "m2", name: "claude-3", provider: "anthropic" },
    ]);

    render(<ModelPicker value="m1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select model")).toBeInTheDocument();
    });
  });

  it("groups by provider", async () => {
    const user = userEvent.setup();
    mockListModels.mockResolvedValue([
      { id: "m1", name: "hermes-3", provider: "openai" },
      { id: "m2", name: "gpt-4", provider: "openai" },
      { id: "m3", name: "claude-3", provider: "anthropic" },
    ]);

    render(<ModelPicker value="m1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select model")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select model"));

    // Provider headers
    expect(screen.getByText("openai")).toBeInTheDocument();
    expect(screen.getByText("anthropic")).toBeInTheDocument();
  });

  it("click model selects it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockListModels.mockResolvedValue([
      { id: "m1", name: "hermes-3", provider: "openai" },
      { id: "m2", name: "claude-3", provider: "anthropic" },
    ]);

    render(<ModelPicker value="m1" onChange={onChange} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select model")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select model"));

    // Click claude-3 (the last one)
    const items = screen.getAllByText("claude-3");
    await user.click(items[items.length - 1]);

    expect(onChange).toHaveBeenCalledWith("m2");
  });

  it("shows provider headers", async () => {
    const user = userEvent.setup();
    mockListModels.mockResolvedValue([
      { id: "m1", name: "hermes-3", provider: "openai" },
      { id: "m2", name: "gpt-4o", provider: "openai" },
    ]);

    render(<ModelPicker value="m1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select model")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select model"));

    expect(screen.getByText("openai")).toBeInTheDocument();
  });
});
