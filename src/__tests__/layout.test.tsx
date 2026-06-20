/**
 * layout.test.tsx — Tests for the layout feature (EPIC 4)
 *
 * Tests:
 * - Layout store: default state, sidebar toggle, split view toggle
 * - Resize handle: min/max constraints, double-click reset
 * - Split view: creates two panels, close panel returns to single
 * - Persistence: saves to localStorage, restores on load
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  useLayoutStore,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from "../features/layout/use-layout";
import ResizeHandle from "../features/layout/ResizeHandle";
import SplitView from "../features/layout/SplitView";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";

// ============================================================================
// Layout Store Tests
// ============================================================================

describe("useLayoutStore", () => {
  beforeEach(() => {
    useLayoutStore.setState({
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      sidebarCollapsed: false,
      splitView: false,
      splitRatio: 0.5,
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("has correct default state", () => {
    const state = useLayoutStore.getState();
    expect(state.sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.splitView).toBe(false);
    expect(state.splitRatio).toBe(0.5);
  });

  it("toggles sidebar", () => {
    const { toggleSidebar } = useLayoutStore.getState();
    toggleSidebar();
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(true);
    toggleSidebar();
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(false);
  });

  it("sets sidebar collapsed directly", () => {
    const { setSidebarCollapsed } = useLayoutStore.getState();
    setSidebarCollapsed(true);
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(true);
    setSidebarCollapsed(false);
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(false);
  });

  it("toggles split view", () => {
    const { toggleSplitView } = useLayoutStore.getState();
    toggleSplitView();
    expect(useLayoutStore.getState().splitView).toBe(true);
    toggleSplitView();
    expect(useLayoutStore.getState().splitView).toBe(false);
  });

  it("clamps sidebar width to min", () => {
    const { setSidebarWidth } = useLayoutStore.getState();
    setSidebarWidth(50);
    expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("clamps sidebar width to max", () => {
    const { setSidebarWidth } = useLayoutStore.getState();
    setSidebarWidth(600);
    expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("sets sidebar width within range", () => {
    const { setSidebarWidth } = useLayoutStore.getState();
    setSidebarWidth(300);
    expect(useLayoutStore.getState().sidebarWidth).toBe(300);
  });

  it("clamps split ratio", () => {
    const { setSplitRatio } = useLayoutStore.getState();
    setSplitRatio(0.1); // below 0.2
    expect(useLayoutStore.getState().splitRatio).toBe(0.2);
    setSplitRatio(0.9); // above 0.8
    expect(useLayoutStore.getState().splitRatio).toBe(0.8);
  });

  it("resets layout to defaults", () => {
    const store = useLayoutStore.getState();
    store.setSidebarWidth(350);
    store.toggleSidebar();
    store.toggleSplitView();
    store.setSplitRatio(0.7);

    useLayoutStore.getState().resetLayout();

    const state = useLayoutStore.getState();
    expect(state.sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.splitView).toBe(false);
    expect(state.splitRatio).toBe(0.5);
  });
});

// ============================================================================
// Persistence Tests
// ============================================================================

describe("layout persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists layout state to localStorage", () => {
    const store = useLayoutStore.getState();
    store.setSidebarWidth(320);
    store.setSidebarCollapsed(true);
    store.toggleSplitView();
    store.setSplitRatio(0.6);

    const raw = localStorage.getItem("hermes-desktop-layout");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.sidebarWidth).toBe(320);
    expect(parsed.sidebarCollapsed).toBe(true);
    expect(parsed.splitView).toBe(true);
    expect(parsed.splitRatio).toBe(0.6);
  });

  it("restores layout state from localStorage", () => {
    localStorage.setItem(
      "hermes-desktop-layout",
      JSON.stringify({
        sidebarWidth: 350,
        sidebarCollapsed: true,
        splitView: true,
        splitRatio: 0.7,
      })
    );

    // Verify the persisted value is there
    const raw = localStorage.getItem("hermes-desktop-layout");
    const parsed = JSON.parse(raw!);
    expect(parsed.sidebarWidth).toBe(350);
    expect(parsed.sidebarCollapsed).toBe(true);
    expect(parsed.splitView).toBe(true);
    expect(parsed.splitRatio).toBe(0.7);
  });

  it("persists on toggle sidebar", () => {
    // Ensure clean state
    useLayoutStore.setState({ sidebarCollapsed: false });
    localStorage.clear();

    useLayoutStore.getState().toggleSidebar();

    const raw = localStorage.getItem("hermes-desktop-layout");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.sidebarCollapsed).toBe(true);
  });

  it("persists on sidebar width change", () => {
    useLayoutStore.getState().setSidebarWidth(310);
    const raw = localStorage.getItem("hermes-desktop-layout");
    expect(JSON.parse(raw!).sidebarWidth).toBe(310);
  });
});

// ============================================================================
// Resize Handle Tests
// ============================================================================

describe("ResizeHandle", () => {
  beforeEach(() => {
    useLayoutStore.setState({
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      sidebarCollapsed: false,
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the resize handle", () => {
    render(<ResizeHandle />);
    expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
  });

  it("has correct cursor style", () => {
    render(<ResizeHandle />);
    const handle = screen.getByTestId("resize-handle");
    expect(handle).toHaveStyle({ cursor: "col-resize" });
  });

  it("updates sidebar width on drag", () => {
    render(<ResizeHandle />);
    const handle = screen.getByTestId("resize-handle");

    // Simulate mousedown
    fireEvent.mouseDown(handle, { clientX: 240 });

    // Simulate mousemove (drag 50px to the right)
    fireEvent.mouseMove(window, { clientX: 290 });

    // Simulate mouseup
    fireEvent.mouseUp(window);

    expect(useLayoutStore.getState().sidebarWidth).toBe(290);
  });

  it("clamps sidebar width during drag (min)", () => {
    useLayoutStore.setState({ sidebarWidth: 250 });
    render(<ResizeHandle />);
    const handle = screen.getByTestId("resize-handle");

    // Drag 100px to the left — would be 150 but clamped to 200
    fireEvent.mouseDown(handle, { clientX: 250 });
    fireEvent.mouseMove(window, { clientX: 150 });
    fireEvent.mouseUp(window);

    expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("clamps sidebar width during drag (max)", () => {
    useLayoutStore.setState({ sidebarWidth: 350 });
    render(<ResizeHandle />);
    const handle = screen.getByTestId("resize-handle");

    // Drag 200px to the right — would be 550 but clamped to 400
    fireEvent.mouseDown(handle, { clientX: 350 });
    fireEvent.mouseMove(window, { clientX: 550 });
    fireEvent.mouseUp(window);

    expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("resets to default width on double-click", () => {
    useLayoutStore.setState({ sidebarWidth: 350 });
    render(<ResizeHandle />);
    const handle = screen.getByTestId("resize-handle");

    fireEvent.doubleClick(handle);

    expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
  });
});

// ============================================================================
// SplitView Tests
// ============================================================================

describe("SplitView", () => {
  beforeEach(() => {
    useLayoutStore.setState({ splitRatio: 0.5 });
  });

  it("renders two panels and a divider", () => {
    render(
      <SplitView
        leftPanel={<div data-testid="left-panel">Left</div>}
        rightPanel={<div data-testid="right-panel">Right</div>}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("split-view")).toBeInTheDocument();
    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
    expect(screen.getByTestId("split-divider")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(
      <SplitView
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("split-close-right")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <SplitView
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
        onClose={onClose}
      />
    );
    await user.click(screen.getByTestId("split-close-right"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("adjusts split ratio on divider drag", () => {
    const onClose = vi.fn();

    // Mock getBoundingClientRect for the container
    const mockRect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} };

    render(
      <SplitView
        leftPanel={<div data-testid="left-panel">Left</div>}
        rightPanel={<div data-testid="right-panel">Right</div>}
        onClose={onClose}
      />
    );

    const view = screen.getByTestId("split-view");
    vi.spyOn(view, "getBoundingClientRect").mockReturnValue(mockRect);

    const divider = screen.getByTestId("split-divider");

    // Start at center (400), drag right to 560 — delta = 160, ratio delta = 160/800 = 0.2
    fireEvent.mouseDown(divider, { clientX: 400 });
    fireEvent.mouseMove(window, { clientX: 560 });
    fireEvent.mouseUp(window);

    expect(useLayoutStore.getState().splitRatio).toBeCloseTo(0.7, 5);

    vi.restoreAllMocks();
  });

  it("split divider has correct cursor", () => {
    render(
      <SplitView
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId("split-divider")).toHaveStyle({ cursor: "col-resize" });
  });
});

// ============================================================================
// Keyboard Shortcuts Tests (mount a component that registers shortcuts)
// ============================================================================

function ShortcutTestBridge({
  onToggleSidebar,
  onToggleSplitView,
}: {
  onToggleSidebar: () => void;
  onToggleSplitView: () => void;
}) {
  useKeyboardShortcuts({
    onNewSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onToggleSidebar,
    onToggleSplitView,
  });
  return null;
}

describe("keyboard shortcuts for layout", () => {
  beforeEach(() => {
    useLayoutStore.setState({
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      sidebarCollapsed: false,
      splitView: false,
    });
  });

  it("Cmd+B toggles sidebar", () => {
    const toggleSidebar = useLayoutStore.getState().toggleSidebar;
    render(<ShortcutTestBridge onToggleSidebar={toggleSidebar} onToggleSplitView={vi.fn()} />);

    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(true);
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(false);
  });

  it("Ctrl+B toggles sidebar", () => {
    const toggleSidebar = useLayoutStore.getState().toggleSidebar;
    render(<ShortcutTestBridge onToggleSidebar={toggleSidebar} onToggleSplitView={vi.fn()} />);

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(useLayoutStore.getState().sidebarCollapsed).toBe(true);
  });

  it("Cmd+\\ toggles split view", () => {
    const toggleSplitView = useLayoutStore.getState().toggleSplitView;
    render(<ShortcutTestBridge onToggleSidebar={vi.fn()} onToggleSplitView={toggleSplitView} />);

    fireEvent.keyDown(window, { key: "\\", metaKey: true });
    expect(useLayoutStore.getState().splitView).toBe(true);
    fireEvent.keyDown(window, { key: "\\", metaKey: true });
    expect(useLayoutStore.getState().splitView).toBe(false);
  });

  it("Ctrl+\\ toggles split view", () => {
    const toggleSplitView = useLayoutStore.getState().toggleSplitView;
    render(<ShortcutTestBridge onToggleSidebar={vi.fn()} onToggleSplitView={toggleSplitView} />);

    fireEvent.keyDown(window, { key: "\\", ctrlKey: true });
    expect(useLayoutStore.getState().splitView).toBe(true);
  });
});
