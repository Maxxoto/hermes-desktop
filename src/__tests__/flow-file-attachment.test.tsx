/**
 * flow-file-attachment.test.tsx — Integration tests for file attachment flow
 *
 * Tests the full user journey: attach files, see chips, remove, clear on send.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "../features/files/use-file-upload";

function makeFile(name: string, type: string, size: number = 100): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

describe("File attachment flow", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("full flow: attach files → see chips → remove one → clear all on send", () => {
    const { result } = renderHook(() => useFileUpload());

    // Step 1: User attaches files
    act(() => {
      result.current.addFiles([
        makeFile("photo.png", "image/png"),
        makeFile("notes.txt", "text/plain"),
        makeFile("data.json", "application/json"),
      ]);
    });
    expect(result.current.files).toHaveLength(3);

    // Step 2: User sees 3 chips, removes one
    const idToRemove = result.current.files[1].id;
    act(() => {
      result.current.removeFile(idToRemove);
    });
    expect(result.current.files).toHaveLength(2);
    expect(result.current.files.find((f) => f.id === idToRemove)).toBeUndefined();

    // Step 3: Send clears all files (simulating what ChatPage does)
    act(() => {
      result.current.clearFiles();
    });
    expect(result.current.files).toHaveLength(0);
  });

  it("full flow: drag-drop adds files, send clears them", () => {
    const { result } = renderHook(() => useFileUpload());

    // Simulate drag-drop adding files
    act(() => {
      result.current.addFiles([makeFile("image.jpg", "image/jpeg", 2048)]);
    });
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].status).toBe("pending");

    // Simulate sending clears files
    act(() => {
      result.current.clearFiles();
    });
    expect(result.current.files).toHaveLength(0);
  });

  it("mixed valid and invalid files are handled correctly", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([
        makeFile("good.txt", "text/plain", 100),
        makeFile("bad.exe", "application/x-executable", 100),
        makeFile("huge.png", "image/png", 11 * 1024 * 1024),
      ]);
    });

    expect(result.current.files).toHaveLength(3);

    const valid = result.current.files.filter((f) => f.status === "pending");
    const errors = result.current.files.filter((f) => f.status === "error");
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });

  it("appending more files adds to existing list", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([makeFile("a.txt", "text/plain", 100)]);
    });
    expect(result.current.files).toHaveLength(1);

    act(() => {
      result.current.addFiles([makeFile("b.md", "text/markdown", 200)]);
    });
    expect(result.current.files).toHaveLength(2);
    expect(result.current.files[0].file.name).toBe("a.txt");
    expect(result.current.files[1].file.name).toBe("b.md");
  });

  it("file names can be extracted for message annotation", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([
        makeFile("report.pdf", "application/pdf", 500),
        makeFile("data.csv", "text/csv", 300),
      ]);
    });

    // Simulate what ChatPage does: extract valid file names
    const fileNames = result.current.files
      .filter((f) => f.status !== "error")
      .map((f) => f.file.name)
      .join(", ");

    expect(fileNames).toBe("report.pdf, data.csv");
  });
});
