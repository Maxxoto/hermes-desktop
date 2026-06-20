/**
 * use-file-upload.test.ts — Unit tests for the useFileUpload hook
 *
 * Tests file validation (size, type), preview URL creation/revocation,
 * and state management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "../features/files/use-file-upload";

function makeFile(
  name: string,
  type: string,
  size: number,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function makeImageFile(
  name: string,
  type: string = "image/png",
  size: number = 1024,
): File {
  return makeFile(name, type, size);
}

describe("useFileUpload", () => {
  // Clean up object URLs after each test
  const createdUrls: string[] = [];
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    createdUrls.length = 0;
    URL.createObjectURL = vi.fn((..._args: unknown[]) => {
      const url = `blob:http://localhost/${Math.random().toString(36).slice(2)}`;
      createdUrls.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("starts with an empty files array", () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.files).toEqual([]);
  });

  // ── addFiles ──────────────────────────────────────────────────────────

  it("adds valid files with pending status", () => {
    const { result } = renderHook(() => useFileUpload());
    const file = makeFile("readme.md", "text/markdown", 500);

    act(() => {
      result.current.addFiles([file]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].file.name).toBe("readme.md");
    expect(result.current.files[0].status).toBe("pending");
  });

  it("creates preview URL for image files", () => {
    const { result } = renderHook(() => useFileUpload());
    const img = makeImageFile("photo.png", "image/png", 2048);

    act(() => {
      result.current.addFiles([img]);
    });

    expect(result.current.files[0].preview).toBeDefined();
    expect(result.current.files[0].preview).toMatch(/^blob:/);
  });

  it("does not create preview URL for non-image files", () => {
    const { result } = renderHook(() => useFileUpload());
    const txt = makeFile("notes.txt", "text/plain", 100);

    act(() => {
      result.current.addFiles([txt]);
    });

    expect(result.current.files[0].preview).toBeUndefined();
  });

  it("rejects files exceeding 10MB size limit", () => {
    const { result } = renderHook(() => useFileUpload());
    const largeFile = makeFile("huge.png", "image/png", 11 * 1024 * 1024);

    act(() => {
      result.current.addFiles([largeFile]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].status).toBe("error");
    expect(result.current.files[0].error).toContain("File too large");
  });

  it("rejects unsupported file types", () => {
    const { result } = renderHook(() => useFileUpload());
    const exe = makeFile("program.exe", "application/x-executable", 100);

    act(() => {
      result.current.addFiles([exe]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].status).toBe("error");
    expect(result.current.files[0].error).toContain("Unsupported file type");
  });

  it("accepts files with allowed extensions even without MIME type", () => {
    const { result } = renderHook(() => useFileUpload());
    // Some files may have empty type but valid extension
    const py = makeFile("script.py", "", 200);

    act(() => {
      result.current.addFiles([py]);
    });

    // Empty type + .py extension → allowed by extension check
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].status).toBe("pending");
  });

  it("accepts multiple files at once", () => {
    const { result } = renderHook(() => useFileUpload());
    const files = [
      makeFile("a.txt", "text/plain", 100),
      makeImageFile("b.png", "image/png", 200),
      makeFile("c.json", "application/json", 300),
    ];

    act(() => {
      result.current.addFiles(files);
    });

    expect(result.current.files).toHaveLength(3);
  });

  it("supports FileList-like input", () => {
    const { result } = renderHook(() => useFileUpload());
    // FileList is read-only, so we simulate with an array
    const files = [makeFile("test.md", "text/markdown", 50)];

    act(() => {
      result.current.addFiles(files);
    });

    expect(result.current.files).toHaveLength(1);
  });

  // ── removeFile ────────────────────────────────────────────────────────

  it("removes a file by id and revokes its preview URL", () => {
    const { result } = renderHook(() => useFileUpload());
    const img = makeImageFile("pic.jpg", "image/jpeg", 512);

    act(() => {
      result.current.addFiles([img]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.files).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("removes only the specified file", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([
        makeFile("a.txt", "text/plain", 100),
        makeFile("b.txt", "text/plain", 200),
      ]);
    });

    const firstId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(firstId);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].file.name).toBe("b.txt");
  });

  // ── clearFiles ────────────────────────────────────────────────────────

  it("clears all files and revokes all preview URLs", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([
        makeImageFile("a.png", "image/png", 100),
        makeFile("b.txt", "text/plain", 200),
      ]);
    });

    expect(result.current.files).toHaveLength(2);

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.files).toHaveLength(0);
    // revokeObjectURL called for the image preview
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  // ── updateFile ────────────────────────────────────────────────────────

  it("updates a file's properties", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.addFiles([makeFile("data.csv", "text/csv", 100)]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.updateFile(fileId, { status: "done", progress: 100 });
    });

    expect(result.current.files[0].status).toBe("done");
    expect(result.current.files[0].progress).toBe(100);
  });
});
