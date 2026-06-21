/**
 * DropZone.test.tsx — Tests for the DropZone component
 *
 * Tests drag-over overlay visibility, drag-leave hiding, and drop callback.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DropZone from "../features/files/DropZone";

describe("DropZone", () => {
  it("renders children", () => {
    render(
      <DropZone onDrop={vi.fn()}>
        <div>Inner content</div>
      </DropZone>,
    );
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("does not show overlay by default", () => {
    render(
      <DropZone onDrop={vi.fn()}>
        <div>Content</div>
      </DropZone>,
    );
    expect(screen.queryByText("Drop files here")).not.toBeInTheDocument();
  });

  it("shows overlay on drag over", () => {
    const { container } = render(
      <DropZone onDrop={vi.fn()}>
        <div>Content</div>
      </DropZone>,
    );

    const dropZone = container.firstElementChild as HTMLElement;
    fireEvent.dragOver(dropZone);

    expect(screen.getByText("Drop files here")).toBeInTheDocument();
    expect(
      screen.getByText("Images, PDFs, text files up to 10MB"),
    ).toBeInTheDocument();
  });

  it("hides overlay on drag leave", () => {
    const { container } = render(
      <DropZone onDrop={vi.fn()}>
        <div>Content</div>
      </DropZone>,
    );

    const dropZone = container.firstElementChild as HTMLElement;
    fireEvent.dragOver(dropZone);
    expect(screen.getByText("Drop files here")).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.queryByText("Drop files here")).not.toBeInTheDocument();
  });

  it("calls onDrop with files on drop event", () => {
    const onDrop = vi.fn();
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });

    const { container } = render(
      <DropZone onDrop={onDrop}>
        <div>Content</div>
      </DropZone>,
    );

    const dropZone = container.firstElementChild as HTMLElement;

    // Use native event dispatch with a mock dataTransfer
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        files: { length: 1, 0: mockFile },
        types: ["Files"],
      },
    });
    dropZone.dispatchEvent(dropEvent);

    expect(onDrop).toHaveBeenCalled();
  });

  it("does not call onDrop when drop has no files", () => {
    const onDrop = vi.fn();

    const { container } = render(
      <DropZone onDrop={onDrop}>
        <div>Content</div>
      </DropZone>,
    );

    const dropZone = container.firstElementChild as HTMLElement;
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        files: { length: 0 },
        types: [],
      },
    });
    dropZone.dispatchEvent(dropEvent);

    expect(onDrop).not.toHaveBeenCalled();
  });
});
