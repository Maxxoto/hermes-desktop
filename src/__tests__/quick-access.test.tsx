import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAccessCard } from "../features/quick-access/QuickAccessCard";
import { ActionButtons } from "../features/quick-access/ActionButtons";
import {
  useQuickAccess,
  detectContentType,
  extractCodeBlock,
  buildPreview,
} from "../features/quick-access/use-quick-access";
import type { ContentType } from "../features/quick-access/ActionButtons";
import React from "react";

// ============================================================================
// Mocks
// ============================================================================

const mockWriteText = vi.fn().mockResolvedValue(undefined);

function setupClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
}

// ============================================================================
// detectContentType Tests
// ============================================================================

describe("detectContentType", () => {
  it("detects code blocks", () => {
    expect(detectContentType("```js\nconsole.log('hi');\n```")).toBe("code");
  });

  it("detects screenshot markers", () => {
    expect(detectContentType("Here is the [Screenshot] analysis")).toBe(
      "screenshot",
    );
  });

  it("detects file operations", () => {
    expect(detectContentType("I wrote file to /tmp/test.txt")).toBe("text");
  });

  it("detects errors", () => {
    expect(detectContentType("Error: module not found")).toBe("error");
  });

  it("returns null for plain text", () => {
    expect(detectContentType("Just a normal response")).toBeNull();
  });

  it("detects Traceback as error", () => {
    expect(detectContentType("Traceback (most recent call last):")).toBe(
      "error",
    );
  });

  it("prioritizes code blocks over other types", () => {
    const text = "Error occurred\n```js\nconst x = 1;\n```";
    expect(detectContentType(text)).toBe("code");
  });
});

// ============================================================================
// extractCodeBlock Tests
// ============================================================================

describe("extractCodeBlock", () => {
  it("extracts code from fenced block", () => {
    const input = "Some text\n```typescript\nconst x = 42;\n```\nMore text";
    expect(extractCodeBlock(input)).toBe("const x = 42;");
  });

  it("returns null for no code block", () => {
    expect(extractCodeBlock("No code here")).toBeNull();
  });

  it("handles multiline code blocks", () => {
    const input = "```\nline1\nline2\nline3\n```";
    expect(extractCodeBlock(input)).toBe("line1\nline2\nline3");
  });
});

// ============================================================================
// buildPreview Tests
// ============================================================================

describe("buildPreview", () => {
  it("builds code preview with first line", () => {
    const result = buildPreview("```js\nconst x = 1;\n```", "code", 80);
    expect(result).toBe("Code: const x = 1;");
  });

  it("builds screenshot preview", () => {
    const result = buildPreview("[Screenshot]", "screenshot", 80);
    expect(result).toBe("Screenshot analysis detected");
  });

  it("builds error preview with first line", () => {
    const result = buildPreview("Error: not found\nmore stack", "error", 80);
    expect(result).toBe("Error: not found");
  });

  it("builds text preview truncated to maxLen", () => {
    const longText = "A".repeat(200);
    const result = buildPreview(longText, "text", 40);
    expect(result.length).toBeLessThanOrEqual(40);
  });
});

// ============================================================================
// QuickAccessCard Tests
// ============================================================================

describe("QuickAccessCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupClipboard();
  });

  it("does not render when not visible", () => {
    render(
      <QuickAccessCard
        content="test"
        contentType="code"
        preview="Code preview"
        visible={false}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("quick-access-card")).not.toBeInTheDocument();
  });

  it("renders when visible with correct badge", () => {
    render(
      <QuickAccessCard
        content="```js\nconst x = 1;\n```"
        contentType="code"
        preview="Code: const x = 1;"
        visible={true}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId("quick-access-card")).toBeInTheDocument();
    expect(screen.getByTestId("qa-badge")).toHaveTextContent("Code");
    expect(screen.getByTestId("qa-preview")).toHaveTextContent(
      "Code: const x = 1;",
    );
  });

  it("renders error badge for error content type", () => {
    render(
      <QuickAccessCard
        content="Error: something broke"
        contentType="error"
        preview="Error: something broke"
        visible={true}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId("qa-badge")).toHaveTextContent("Error");
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const onDismiss = vi.fn();
    render(
      <QuickAccessCard
        content="test"
        contentType="text"
        preview="text"
        visible={true}
        onDismiss={onDismiss}
      />,
    );

    await userEvent.click(screen.getByTestId("qa-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss on Escape key", async () => {
    const onDismiss = vi.fn();
    render(
      <QuickAccessCard
        content="test"
        contentType="text"
        preview="text"
        visible={true}
        onDismiss={onDismiss}
      />,
    );

    // The keydown listener is attached with a 50ms delay to avoid
    // the initial trigger click. Wait for it.
    await waitFor(() => {
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it("renders action buttons based on content type", () => {
    const onSave = vi.fn();
    const onRun = vi.fn();
    render(
      <QuickAccessCard
        content="```js\nconst x = 1;\n```"
        contentType="code"
        preview="Code"
        visible={true}
        onDismiss={vi.fn()}
        onSave={onSave}
        onRun={onRun}
      />,
    );

    expect(screen.getByTestId("qa-copy")).toBeInTheDocument();
    expect(screen.getByTestId("qa-save")).toBeInTheDocument();
    expect(screen.getByTestId("qa-run")).toBeInTheDocument();
  });

  it("shows attach button for screenshot type", () => {
    render(
      <QuickAccessCard
        content="[Screenshot]"
        contentType="screenshot"
        preview="Screenshot"
        visible={true}
        onDismiss={vi.fn()}
        onAttach={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByTestId("qa-attach")).toBeInTheDocument();
    expect(screen.getByTestId("qa-save")).toBeInTheDocument();
  });

  it("shows retry for error type", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(
      <QuickAccessCard
        content="Error: crash"
        contentType="error"
        preview="Error: crash"
        visible={true}
        onDismiss={onDismiss}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId("qa-retry")).toBeInTheDocument();
  });
});

// ============================================================================
// ActionButtons Tests
// ============================================================================

describe("ActionButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    setupClipboard();
  });

  it("renders copy button for all content types", () => {
    const types: ContentType[] = ["code", "screenshot", "text", "error"];
    for (const type of types) {
      const { unmount } = render(
        <ActionButtons contentType={type} content="test" />,
      );
      expect(screen.getByTestId("qa-copy")).toBeInTheDocument();
      unmount();
    }
  });

  it("shows Save and Run for code type", () => {
    render(
      <ActionButtons
        contentType="code"
        content="test"
        onSave={vi.fn()}
        onRun={vi.fn()}
      />,
    );
    expect(screen.getByTestId("qa-save")).toBeInTheDocument();
    expect(screen.getByTestId("qa-run")).toBeInTheDocument();
  });

  it("shows Bookmark for text type", () => {
    render(
      <ActionButtons
        contentType="text"
        content="test"
        onBookmark={vi.fn()}
      />,
    );
    expect(screen.getByTestId("qa-bookmark")).toBeInTheDocument();
  });

  it("shows Copy Error for error type", () => {
    render(
      <ActionButtons contentType="error" content="Error" onRetry={vi.fn()} />,
    );
    expect(screen.getByTestId("qa-retry")).toBeInTheDocument();
    expect(screen.getByTestId("qa-copy-error")).toBeInTheDocument();
  });

  it("copies content to clipboard on copy click", async () => {
    render(<ActionButtons contentType="text" content="Copy me" />);
    await userEvent.click(screen.getByTestId("qa-copy"));
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("Copy me");
    });
  });
});

// ============================================================================
// useQuickAccess Hook Integration Tests
// ============================================================================

describe("useQuickAccess hook", () => {
  // Use real timers for hook tests to avoid waitFor conflicts.
  // Auto-dismiss set to 100ms in tests for fast verification.

  function HookTest({ onState }: {
    onState: (s: ReturnType<typeof useQuickAccess>) => void;
  }) {
    const state = useQuickAccess({ autoDismissMs: 100 });
    const stateRef = React.useRef(state);
    stateRef.current = state;
    React.useEffect(() => {
      onState(state);
    });
    return (
      <div>
        {state.visible && <span data-testid="hook-visible" />}
        <button
          data-testid="hook-show"
          onClick={() => state.show("```js\nconst x = 1;\n```", "code")}
        />
        <button
          data-testid="hook-show-error"
          onClick={() => state.show("Error: bad", "error")}
        />
        <button data-testid="hook-dismiss" onClick={state.dismiss} />
        <button
          data-testid="hook-evaluate"
          onClick={() =>
            state.evaluateResponse(
              "Result:\n```python\nprint('hi')\n```",
            )
          }
        />
        <button
          data-testid="hook-evaluate-plain"
          onClick={() => state.evaluateResponse("Nothing special here")}
        />
      </div>
    );
  }

  it("starts with no visible item", () => {
    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);
    const last = states[states.length - 1];
    expect(last.visible).toBe(false);
    expect(last.item).toBeNull();
  });

  it("shows item when show() is called", async () => {
    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-show"));
    });

    const last = states[states.length - 1];
    expect(last.visible).toBe(true);
    expect(last.item?.contentType).toBe("code");
  });

  it("auto-dismisses after timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-show"));
    });

    let last = states[states.length - 1];
    expect(last.visible).toBe(true);

    // Advance past 100ms auto-dismiss
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    last = states[states.length - 1];
    expect(last.visible).toBe(false);

    vi.useRealTimers();
  });

  it("dismisses manually via dismiss()", async () => {
    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-show"));
    });

    expect(states[states.length - 1].visible).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-dismiss"));
    });

    expect(states[states.length - 1].visible).toBe(false);
  });

  it("evaluateResponse triggers show for code content", async () => {
    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-evaluate"));
    });

    const last = states[states.length - 1];
    expect(last.visible).toBe(true);
    expect(last.item?.contentType).toBe("code");
  });

  it("evaluateResponse does nothing for plain text", async () => {
    const states: ReturnType<typeof useQuickAccess>[] = [];
    render(<HookTest onState={(s) => states.push(s)} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("hook-evaluate-plain"));
    });

    const last = states[states.length - 1];
    expect(last.visible).toBe(false);
  });
});
