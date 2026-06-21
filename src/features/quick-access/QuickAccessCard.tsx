import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { ActionButtons } from "./ActionButtons";
import type { ContentType } from "./ActionButtons";

// ============================================================================
// Types
// ============================================================================

export interface QuickAccessCardProps {
  /** Content string */
  content: string;
  /** Detected content type */
  contentType: ContentType;
  /** Short preview line */
  preview: string;
  /** Whether to show the card */
  visible: boolean;
  /** Dismiss callback */
  onDismiss: () => void;
  /** Action callbacks */
  onCopy?: (content: string) => void;
  onSave?: (content: string) => void;
  onRun?: (content: string) => void;
  onRetry?: () => void;
  onAttach?: (content: string) => void;
  onBookmark?: (content: string) => void;
  /** Optional position override */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

// ============================================================================
// Content Type Badge
// ============================================================================

const BADGE_CONFIG: Record<ContentType, { label: string; color: string }> = {
  code: {
    label: "Code",
    color:
      "dark:bg-blue-500/15 dark:text-blue-400 light:bg-blue-100 light:text-blue-600",
  },
  screenshot: {
    label: "Screenshot",
    color:
      "dark:bg-purple-500/15 dark:text-purple-400 light:bg-purple-100 light:text-purple-600",
  },
  text: {
    label: "Text",
    color:
      "dark:bg-white/[0.08] dark:text-mac-secondary-label light:bg-gray-100 light:text-gray-600",
  },
  error: {
    label: "Error",
    color:
      "dark:bg-red-500/15 dark:text-red-400 light:bg-red-100 light:text-red-600",
  },
};

// ============================================================================
// Position styles
// ============================================================================

const POSITION_CLASSES: Record<string, string> = {
  "bottom-right": "bottom-5 right-5",
  "bottom-left": "bottom-5 left-5",
  "top-right": "top-5 right-5",
  "top-left": "top-5 left-5",
};

// ============================================================================
// QuickAccessCard
// ============================================================================

export function QuickAccessCard({
  content,
  contentType,
  preview,
  visible,
  onDismiss,
  onCopy,
  onSave,
  onRun,
  onRetry,
  onAttach,
  onBookmark,
  position = "bottom-right",
}: QuickAccessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  // Escape to dismiss
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    },
    [onDismiss],
  );

  useEffect(() => {
    if (!visible) return;

    // Delay listener attachment to avoid the click that triggered show()
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, handleClickOutside, handleKeyDown]);

  if (!visible) return null;

  const badge = BADGE_CONFIG[contentType];

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Quick access"
      data-testid="quick-access-card"
      className={cn(
        // Glass surface
        "fixed z-50 w-[320px]",
        "rounded-xl border",
        "dark:bg-mac-glass dark:border-white/[0.12] dark:backdrop-blur-xl dark:shadow-2xl dark:shadow-black/40",
        "light:bg-white/80 light:border-black/[0.08] light:backdrop-blur-xl light:shadow-xl light:shadow-black/10",
        // Position
        POSITION_CLASSES[position],
        // Slide-up animation
        "animate-quick-access-in",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
              badge.color,
            )}
            data-testid="qa-badge"
          >
            {badge.label}
          </span>
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss"
          aria-label="Dismiss quick access card"
          className={cn(
            "p-1 rounded-md",
            "dark:text-mac-quaternary-label light:text-gray-400",
            "dark:hover:text-mac-secondary-label light:hover:text-gray-600",
            "dark:hover:bg-white/[0.06] light:hover:bg-black/[0.04]",
            "transition-colors duration-150",
          )}
          data-testid="qa-dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preview */}
      <div className="px-3.5 pb-3">
        <p
          className={cn(
            "text-[12px] leading-relaxed line-clamp-3",
            "dark:text-mac-secondary-label light:text-gray-600",
          )}
          data-testid="qa-preview"
        >
          {preview}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-3.5 border-t dark:border-white/[0.08] light:border-black/[0.06]" />

      {/* Action buttons */}
      <div className="px-3.5 py-2.5">
        <ActionButtons
          contentType={contentType}
          content={content}
          onCopy={onCopy}
          onSave={onSave}
          onRun={onRun}
          onRetry={onRetry}
          onAttach={onAttach}
          onBookmark={onBookmark}
        />
      </div>
    </div>
  );
}
