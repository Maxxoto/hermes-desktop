import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  Bookmark,
  Link,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface BlockToolbarProps {
  content: string;
  role: "user" | "assistant";
  onRetry?: () => void;
  onBookmark?: (content: string) => void;
  onAttach?: (content: string) => void;
}

export function BlockToolbar({
  content,
  role,
  onRetry,
  onBookmark,
  onAttach,
}: BlockToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might not be available in all contexts
    }
  }, [content]);

  const handleBookmark = useCallback(() => {
    setBookmarked(true);
    onBookmark?.(content);
    setTimeout(() => setBookmarked(false), 2000);
  }, [content, onBookmark]);

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-1 py-0.5 rounded-lg",
        "opacity-0 group-hover:opacity-100",
        "transition-opacity duration-200",
        "backdrop-blur-xl",
        "dark:bg-white/[0.06] light:bg-black/[0.04]",
        "border dark:border-white/[0.08] light:border-black/[0.06]",
      )}
      data-testid="block-toolbar"
    >
      {/* Copy */}
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy message"}
        aria-label={copied ? "Copied!" : "Copy message"}
        className={cn(
          "mac-icon-btn !w-6 !h-6 transition-all duration-150 active:scale-[0.92]",
          copied
            ? "dark:text-mac-green light:text-green-600"
            : "dark:text-mac-tertiary-label light:text-gray-400",
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>

      {/* Retry — assistant blocks only */}
      {role === "assistant" && onRetry && (
        <button
          onClick={onRetry}
          title="Regenerate response"
          aria-label="Regenerate response"
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-tertiary-label light:text-gray-400 transition-all duration-150 active:scale-[0.92]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bookmark */}
      {onBookmark && (
        <button
          onClick={handleBookmark}
          title={bookmarked ? "Bookmarked!" : "Bookmark message"}
          aria-label={bookmarked ? "Bookmarked!" : "Bookmark message"}
          className={cn(
            "mac-icon-btn !w-6 !h-6 transition-all duration-150 active:scale-[0.92]",
            bookmarked
              ? "dark:text-mac-orange light:text-orange-500"
              : "dark:text-mac-tertiary-label light:text-gray-400",
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Attach */}
      {onAttach && (
        <button
          onClick={() => onAttach(content)}
          title="Attach to next message"
          aria-label="Attach to next message"
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-tertiary-label light:text-gray-400 transition-all duration-150 active:scale-[0.92]"
        >
          <Link className="h-3.5 w-3.5" />
        </button>
      )}

      {/* More */}
      <button
        title="More actions"
        aria-label="More actions"
        className="mac-icon-btn !w-6 !h-6 dark:text-mac-tertiary-label light:text-gray-400 transition-all duration-150 active:scale-[0.92]"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
