/**
 * CompressButton.test.tsx — React component tests for CompressButton
 *
 * Tests message count display (singular/plural) and tooltip text.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CompressButton from "../features/chat/CompressButton";

describe("CompressButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Message count display -----------------------------------------------

  it("shows '0 messages' when messageCount is 0", () => {
    render(<CompressButton messageCount={0} />);
    expect(screen.getByText(/0 messages/)).toBeInTheDocument();
  });

  it("shows '1 message' (singular) when messageCount is 1", () => {
    render(<CompressButton messageCount={1} />);
    expect(screen.getByText(/1 message/)).toBeInTheDocument();
    expect(screen.queryByText(/1 messages/)).not.toBeInTheDocument();
  });

  it("shows '5 messages' (plural) when messageCount is 5", () => {
    render(<CompressButton messageCount={5} />);
    expect(screen.getByText(/5 messages/)).toBeInTheDocument();
  });

  it("shows '42 messages' for larger counts", () => {
    render(<CompressButton messageCount={42} />);
    expect(screen.getByText(/42 messages/)).toBeInTheDocument();
  });

  // ---- Tooltip / info ------------------------------------------------------

  it("renders a button with compression tooltip title", () => {
    render(<CompressButton messageCount={10} />);
    const button = screen.getByTitle("Context is compressed automatically at 50%");
    expect(button).toBeInTheDocument();
  });

  it("renders the info icon button", () => {
    render(<CompressButton messageCount={3} />);
    // The button has type="button"
    const button = screen.getByTitle("Context is compressed automatically at 50%");
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders the tooltip text element", () => {
    const { container } = render(<CompressButton messageCount={3} />);
    // The tooltip div contains the compression message
    expect(screen.getByText("Context is compressed automatically at 50%")).toBeInTheDocument();
    // Verify the tooltip container exists (hidden by default, shown on hover)
    const tooltipContainers = container.querySelectorAll(".group-hover\\:opacity-100");
    expect(tooltipContainers.length).toBeGreaterThanOrEqual(1);
  });

  // ---- Ruler emoji icon ----------------------------------------------------

  it("displays the ruler emoji icon", () => {
    render(<CompressButton messageCount={2} />);
    expect(screen.getByText("📏")).toBeInTheDocument();
  });
});
