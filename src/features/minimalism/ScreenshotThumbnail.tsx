import { X } from "lucide-react";

interface ScreenshotThumbnailProps {
  /** Base64 data URL (data:image/png;base64,...) */
  dataUrl: string;
  onRemove: () => void;
}

/**
 * Compact thumbnail chip shown in the input area after capturing a screenshot.
 * Can be removed with the X button. Max size 200×120px.
 */
export function ScreenshotThumbnail({ dataUrl, onRemove }: ScreenshotThumbnailProps) {
  return (
    <div className="relative inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.06]">
      <img
        src={dataUrl}
        alt="Screenshot preview"
        className="rounded max-w-[200px] max-h-[60px] object-cover"
        style={{ width: "auto", height: "auto" }}
      />
      <button
        onClick={onRemove}
        title="Remove screenshot"
        aria-label="Remove screenshot"
        className="opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 dark:text-mac-secondary-label light:text-gray-600" />
      </button>
    </div>
  );
}
