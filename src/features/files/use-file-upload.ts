import { useState, useCallback } from "react";

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string; // object URL for images
  status: "pending" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

const ALLOWED_EXTENSIONS =
  /\.(md|txt|json|csv|py|js|ts|tsx|jsx|go|rs|yaml|yml|toml)$/i;

export function useFileUpload() {
  const [files, setFiles] = useState<AttachedFile[]>([]);

  const addFiles = useCallback((inputFiles: FileList | File[]) => {
    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(inputFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          file,
          status: "error",
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`,
        });
        continue;
      }
      if (
        !ALLOWED_TYPES.includes(file.type) &&
        !file.name.match(ALLOWED_EXTENSIONS)
      ) {
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          file,
          status: "error",
          error: `Unsupported file type: ${file.type || file.name.split(".").pop()}`,
        });
        continue;
      }
      const isImage = file.type.startsWith("image/");
      newFiles.push({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
        status: "pending",
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
  }, []);

  const updateFile = useCallback(
    (id: string, updates: Partial<AttachedFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  return { files, addFiles, removeFile, clearFiles, updateFile };
}
