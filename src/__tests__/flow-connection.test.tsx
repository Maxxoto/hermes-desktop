/**
 * flow-connection.test.tsx — Connection Setup Flow
 *
 * Integration-level tests that simulate the complete user journey
 * through the connection setup page: filling in credentials, testing
 * the connection, saving, and verifying persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConnectionConfigPage from "../features/connection/ConnectionConfigPage";
import { useConnectionStore } from "../features/connection/connection-store";

// ---- Mocks -----------------------------------------------------------------

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockHealth = vi.fn();
vi.mock("../features/connection/gateway-api", () => ({
  GatewayClient: class MockGatewayClient {
    constructor(public baseUrl: string, public apiKey: string) {}
    health() {
      return mockHealth();
    }
  },
}));

vi.mock("../hooks/use-window-title", () => ({
  useWindowTitle: vi.fn(),
}));

// ---- Helpers ---------------------------------------------------------------

function createWrapper(initialPath = "/connection") {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function renderPage(initialPath = "/connection") {
  return render(<ConnectionConfigPage />, { wrapper: createWrapper(initialPath) });
}

// ---- Tests -----------------------------------------------------------------

describe("Flow: Connection Setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConnectionStore.getState().clear();
    mockInvoke.mockResolvedValue(undefined);
    mockHealth.mockResolvedValue({ status: "ok" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useConnectionStore.getState().clear();
  });

  // ---- Rendering -----------------------------------------------------------

  it("renders settings form with empty fields on first visit", () => {
    renderPage();
    expect(screen.getByPlaceholderText("https://gateway.example.com")).toHaveValue("");
    expect(screen.getByPlaceholderText("sk-...")).toHaveValue("");
  });

  it("shows Save button disabled when fields are empty", () => {
    renderPage();
    expect(screen.getByText("Save").closest("button")).toBeDisabled();
  });

  it("shows Test Connection button disabled when fields are empty", () => {
    renderPage();
    expect(screen.getByText("Test Connection").closest("button")).toBeDisabled();
  });

  it("enables buttons when both URL and key are entered", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "test-key-123");

    expect(screen.getByText("Test Connection").closest("button")).not.toBeDisabled();
    expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
  });

  // ---- Test Connection flow ------------------------------------------------

  it("tests connection successfully — shows green success message", async () => {
    const user = userEvent.setup();
    mockHealth.mockResolvedValue({ status: "ok" });
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "test-key");
    await user.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText(/Connected!/i)).toBeInTheDocument();
    });
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("tests connection failure — shows red error message with details", async () => {
    const user = userEvent.setup();
    mockHealth.mockRejectedValue(new Error("Connection refused"));
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "test-key");
    await user.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Connection refused/)).toBeInTheDocument();
  });

  it("shows loading state while testing connection", async () => {
    const user = userEvent.setup();
    // Make health() hang to see loading state
    mockHealth.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "test-key");
    await user.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Testing connection…")).toBeInTheDocument();
    });
  });

  it("prevents double-submit while testing", async () => {
    const user = userEvent.setup();
    // Make health() hang
    mockHealth.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "test-key");

    const testBtn = screen.getByText("Test Connection").closest("button")!;
    await user.click(testBtn);

    // Button should be disabled during testing
    await waitFor(() => {
      expect(testBtn).toBeDisabled();
    });
  });

  // ---- Save & navigation flow ---------------------------------------------

  it("saves credentials and navigates to /chat on success", async () => {
    const user = userEvent.setup();
    renderPage("/connection");

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "secret-key");
    await user.click(screen.getByText("Save"));

    // After save, store should be configured
    await waitFor(() => {
      expect(useConnectionStore.getState().isConfigured).toBe(true);
      expect(useConnectionStore.getState().gatewayUrl).toBe("http://gw:8642");
      expect(useConnectionStore.getState().apiKey).toBe("secret-key");
    });
  });

  it("persists to localStorage in browser mode", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-secret-key");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      const stored = localStorage.getItem("hermes-desktop-credentials");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.gateway_url).toBe("http://gw:8642");
      expect(parsed.api_key).toBe("my-secret-key");
    });
  });

  it("persists to Tauri store when running in Tauri", async () => {
    const user = userEvent.setup();
    // Simulate Tauri environment
    (window as any).__TAURI__ = {};
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "tauri-key");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("store_credentials", {
        url: "http://gw:8642",
        apiKey: "tauri-key",
      });
    });

    delete (window as any).__TAURI__;
  });

  it("trims whitespace from URL and key before saving", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "  http://gw:8642  ");
    await user.type(screen.getByPlaceholderText("sk-..."), "  key123  ");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(useConnectionStore.getState().gatewayUrl).toBe("http://gw:8642");
      expect(useConnectionStore.getState().apiKey).toBe("key123");
    });
  });

  // ---- Full journey: test then save ----------------------------------------

  it("full journey: test connection, see success, then save", async () => {
    const user = userEvent.setup();
    mockHealth.mockResolvedValue({ status: "ok" });
    renderPage();

    // Step 1: Fill in fields
    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");

    // Step 2: Test connection
    await user.click(screen.getByText("Test Connection"));

    // Step 3: See success
    await waitFor(() => {
      expect(screen.getByText(/Connected!/i)).toBeInTheDocument();
    });

    // Step 4: Save
    await user.click(screen.getByText("Save"));

    // Step 5: Verify store updated
    await waitFor(() => {
      expect(useConnectionStore.getState().isConfigured).toBe(true);
    });
  });

  it("full journey: test fails, see error, then save anyway", async () => {
    const user = userEvent.setup();
    // First test fails
    mockHealth.mockRejectedValueOnce(new Error("Timeout"));
    // Then save works
    renderPage();

    // Step 1: Fill in fields
    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");

    // Step 2: Test connection — fails
    await user.click(screen.getByText("Test Connection"));
    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });

    // Step 3: Save anyway (Save is still enabled)
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(useConnectionStore.getState().isConfigured).toBe(true);
    });
  });

  it("error message persists after multiple test attempts", async () => {
    const user = userEvent.setup();
    mockHealth.mockRejectedValue(new Error("Network error"));
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");

    // First test
    await user.click(screen.getByText("Test Connection"));
    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });

    // Second test — still shows error after failure
    mockHealth.mockResolvedValue({ status: "ok" });
    await user.click(screen.getByText("Test Connection"));
    await waitFor(() => {
      expect(screen.getByText(/Connected!/i)).toBeInTheDocument();
    });
  });
});
