/**
 * AttachmentChip.test.tsx — Tests for the AttachmentChip component
 *
 * Renders file info, shows previews, error states, and remove button.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AttachmentChip from "../features/files/AttachmentChip";
import type { AttachedFile } from "../features/files/use-file-upload";

function makeAttachedFile(overrides: Partial<AttachedFile> & { file?: File } = {}): AttachedFile {
  const file = overrides.file ?? new File(["content"], "test.txt", { type: "text/plain" });
  return {
    id: "test-id",
    file,
    status: "pending",
    ...overrides,
  };
}

describe("AttachmentChip", () => {
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-preview");
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
  });

  it("renders file name", () => {
    const file = new File(["data"], "readme.md", { type: "text/markdown" });
    render(
      <AttachmentChip file={makeAttachedFile({ file })} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("readme.md")).toBeInTheDocument();
  });

  it("renders file size for small file", () => {
    const file = new File(["x"], "tiny.txt", { type: "text/plain" });
    render(
      <AttachmentChip file={makeAttachedFile({ file })} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("1B")).toBeInTheDocument();
  });

  it("renders file size in KB", () => {
    const buffer = new ArrayBuffer(5 * 1024);
    const file = new File([buffer], "medium.bin", { type: "application/octet-stream" });
    render(
      <AttachmentChip file={makeAttachedFile({ file })} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("5.0KB")).toBeInTheDocument();
  });

  it("renders image preview for image files with preview URL", () => {
    const file = new File(["img"], "photo.png", { type: "image/png" });
    render(
      <AttachmentChip
        file={makeAttachedFile({ file, preview: "blob:http://localhost/img" })}
        onRemove={vi.fn()}
      />,
    );
    const img = screen.getByRole("img", { name: "photo.png" });
    expect(img).toHaveAttribute("src", "blob:http://localhost/img");
  });

  it("renders error state with error message", () => {
    const file = new File(["x"], "huge.zip", { type: "application/zip" });
    render(
      <AttachmentChip
        file={makeAttachedFile({ file, status: "error", error: "File too large" })}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText("— File too large")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    const file = new File(["x"], "test.txt", { type: "text/plain" });
    render(
      <AttachmentChip file={makeAttachedFile({ file, id: "abc-123" })} onRemove={onRemove} />,
    );
    const removeBtn = screen.getByTitle("Remove");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("abc-123");
  });

  it("renders FileText icon for non-image files", () => {
    const file = new File(["x"], "data.json", { type: "application/json" });
    const { container } = render(
      <AttachmentChip file={makeAttachedFile({ file })} onRemove={vi.fn()} />,
    );
    // FileText icon is an SVG — verify chip renders without crash
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
