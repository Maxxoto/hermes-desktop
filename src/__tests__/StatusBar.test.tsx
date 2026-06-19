/**
 * StatusBar.test.tsx — React component tests for StatusBar
 *
 * Tests connection indicator states (connecting/connected/disconnected),
 * active session count display, and version rendering.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StatusBar from "../features/status/StatusBar";

// ---- Mock useGatewayHealth ------------------------------------------------

let mockHealthReturn: {
  data?: { status: string; activeSessions: number; version: string };
  isLoading: boolean;
  isError: boolean;
  reconnectIn: number | null;
};

vi.mock("../features/status/use-gateway-health", () => ({
  useGatewayHealth: () => mockHealthReturn,
}));

// ---- Wrapper ---------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
}

// ---- Tests -----------------------------------------------------------------

describe("StatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHealthReturn = {
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Loading state -------------------------------------------------------

  it("shows 'Connecting…' when loading", () => {
    mockHealthReturn = { isLoading: true, isError: false, reconnectIn: null };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  // ---- Connected state -----------------------------------------------------

  it("shows 'Connected' when status is ok", () => {
    mockHealthReturn = {
      data: { status: "ok", activeSessions: 2, version: "1.2.3" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows 'Connected' when status is healthy", () => {
    mockHealthReturn = {
      data: { status: "healthy", activeSessions: 0, version: "1.0" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("is case-insensitive for status check", () => {
    mockHealthReturn = {
      data: { status: "OK", activeSessions: 0, version: "1.0" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  // ---- Disconnected state --------------------------------------------------

  it("shows 'Connection lost' on error", () => {
    mockHealthReturn = {
      isLoading: false,
      isError: true,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();
    expect(screen.getByText(/retrying/i)).toBeInTheDocument();
  });

  it("shows 'Connection lost' when status is unhealthy", () => {
    mockHealthReturn = {
      data: { status: "degraded", activeSessions: 0, version: "1.0" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();
  });

  it("shows reconnect countdown when reconnectIn is set", () => {
    mockHealthReturn = {
      isLoading: false,
      isError: true,
      reconnectIn: 15,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText(/reconnecting in 15s/i)).toBeInTheDocument();
  });

  // ---- Session count + version --------------------------------------------

  it("shows active session count (plural)", () => {
    mockHealthReturn = {
      data: { status: "ok", activeSessions: 5, version: "1.0" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("5 active sessions")).toBeInTheDocument();
  });

  it("shows active session count (singular)", () => {
    mockHealthReturn = {
      data: { status: "ok", activeSessions: 1, version: "1.0" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("1 active session")).toBeInTheDocument();
  });

  it("shows version", () => {
    mockHealthReturn = {
      data: { status: "ok", activeSessions: 0, version: "3.1.4" },
      isLoading: false,
      isError: false,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("v3.1.4")).toBeInTheDocument();
  });

  it("shows '?' as version when no data", () => {
    mockHealthReturn = {
      isLoading: false,
      isError: true,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.getByText("v?")).toBeInTheDocument();
  });

  it("hides session count when no data", () => {
    mockHealthReturn = {
      isLoading: false,
      isError: true,
      reconnectIn: null,
    };
    renderWithProviders(<StatusBar />);
    expect(screen.queryByText(/active session/i)).not.toBeInTheDocument();
  });
});
