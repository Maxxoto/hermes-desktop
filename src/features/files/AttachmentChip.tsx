import { FileImage, FileText, X } from "lucide-react";
import type { AttachedFile } from "./use-file-upload";

interface AttachmentChipProps {
  file: AttachedFile;
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function AttachmentChip({ file, onRemove }: AttachmentChipProps) {
  const isImage = file.file.type.startsWith("image/");
  const isError = file.status === "error";

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors
      ${
        isError
          ? "dark:bg-mac-red/10 dark:border-mac-red/30 dark:text-mac-red light:bg-red-50 light:border-red-200 light:text-red-600"
          : "dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-mac-secondary-label light:bg-gray-50 light:border-gray-200 light:text-gray-600"
      }`}
    >
      {isImage && file.preview ? (
        <img
          src={file.preview}
          alt={file.file.name}
          className="w-5 h-5 rounded object-cover"
        />
      ) : isImage ? (
        <FileImage className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      ) : (
        <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      )}
      <span className="truncate max-w-[120px] font-medium">
        {file.file.name}
      </span>
      <span className="text-[9px] opacity-60">{formatSize(file.file.size)}</span>
      {isError && file.error && (
        <span className="text-[9px] opacity-80">— {file.error}</span>
      )}
      <button
        onClick={() => onRemove(file.id)}
        title="Remove"
        className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
