/**
 * ConnectionConfigPage.test.tsx — React component tests for ConnectionConfigPage
 *
 * Tests form rendering, credential entry, save flow, test connection flow,
 * and redirect behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConnectionConfigPage from "../features/connection/ConnectionConfigPage";
import { useConnectionStore } from "../features/connection/connection-store";

// ---- Mock @tauri-apps/api/core (invoke) -----------------------------------

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// ---- Mock GatewayClient.health via useTestConnection ----------------------
// useTestConnection uses `new GatewayClient(baseUrl, key).health()` internally.
// We mock the GatewayClient class so health() is controllable.

const mockHealth = vi.fn();
vi.mock("../features/connection/gateway-api", () => ({
  GatewayClient: class MockGatewayClient {
    constructor(public baseUrl: string, public apiKey: string) {}
    health() {
      return mockHealth();
    }
  },
}));

// ---- Wrappers --------------------------------------------------------------

function renderPage(initialPath = "/") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[initialPath]}>
        <ConnectionConfigPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---- Tests -----------------------------------------------------------------

describe("ConnectionConfigPage", () => {
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

  it("renders the header title", () => {
    renderPage();
    expect(screen.getByText("Hermes Desktop")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderPage();
    expect(screen.getByText("Connect to your Hermes Gateway")).toBeInTheDocument();
  });

  it("renders Gateway URL input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("https://gateway.example.com")).toBeInTheDocument();
  });

  it("renders API Key input (password type)", () => {
    renderPage();
    const apiKeyInput = screen.getByPlaceholderText("sk-...");
    expect(apiKeyInput).toBeInTheDocument();
    expect(apiKeyInput).toHaveAttribute("type", "password");
  });

  it("renders Test Connection and Save buttons", () => {
    renderPage();
    expect(screen.getByText("Test Connection")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  // ---- Disabled state ------------------------------------------------------

  it("disables buttons when fields are empty", () => {
    renderPage();
    expect(screen.getByText("Test Connection").closest("button")).toBeDisabled();
    expect(screen.getByText("Save").closest("button")).toBeDisabled();
  });

  it("enables buttons when both fields are filled", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");

    expect(screen.getByText("Test Connection").closest("button")).not.toBeDisabled();
    expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
  });

  // ---- Test Connection -----------------------------------------------------

  it("calls health() and shows success on test connection", async () => {
    const user = userEvent.setup();
    mockHealth.mockResolvedValue({ status: "ok" });

    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");
    await user.click(screen.getByText("Test Connection"));

    expect(await screen.findByText(/Connected!/i)).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("shows error message on test connection failure", async () => {
    const user = userEvent.setup();
    mockHealth.mockRejectedValue(new Error("Connection refused"));

    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://localhost:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "my-key");
    await user.click(screen.getByText("Test Connection"));

    expect(await screen.findByText(/Connection failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Connection refused/)).toBeInTheDocument();
  });

  // ---- Save ----------------------------------------------------------------

  it("stores credentials on save", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "secret-key");
    await user.click(screen.getByText("Save"));

    const state = useConnectionStore.getState();
    expect(state.gatewayUrl).toBe("http://gw:8642");
    expect(state.apiKey).toBe("secret-key");
    expect(state.isConfigured).toBe(true);
  });

  it("calls invoke store_credentials on save", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "http://gw:8642");
    await user.type(screen.getByPlaceholderText("sk-..."), "secret-key");
    await user.click(screen.getByText("Save"));

    expect(mockInvoke).toHaveBeenCalledWith("store_credentials", {
      url: "http://gw:8642",
      apiKey: "secret-key",
    });
  });

  it("trims whitespace on save", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("https://gateway.example.com"), "  http://gw:8642  ");
    await user.type(screen.getByPlaceholderText("sk-..."), "  key123  ");
    await user.click(screen.getByText("Save"));

    expect(useConnectionStore.getState().gatewayUrl).toBe("http://gw:8642");
    expect(useConnectionStore.getState().apiKey).toBe("key123");
  });
});
