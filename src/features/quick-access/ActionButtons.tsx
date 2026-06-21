import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  Save,
  Play,
  RefreshCw,
  Paperclip,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ContentType = "code" | "screenshot" | "text" | "error";

export interface ActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeLabel?: string;
  activeIcon?: React.ReactNode;
  onClick: () => void;
}

export interface ActionButtonsProps {
  contentType: ContentType;
  content: string;
  onCopy?: (content: string) => void;
  onSave?: (content: string) => void;
  onRun?: (content: string) => void;
  onRetry?: () => void;
  onAttach?: (content: string) => void;
  onBookmark?: (content: string) => void;
}

// ============================================================================
// Copy Button (shared)
// ============================================================================

function CopyButton({
  content,
  onCopy,
}: {
  content: string;
  onCopy?: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy?.(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, [content, onCopy]);

  return (
    <button
      onClick={handleClick}
      title={copied ? "Copied!" : "Copy"}
      aria-label={copied ? "Copied!" : "Copy"}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium",
        "transition-all duration-150 active:scale-[0.95]",
        copied
          ? "dark:text-mac-green light:text-green-600 bg-green-500/10"
          : "dark:text-mac-secondary-label light:text-gray-600 dark:hover:bg-white/[0.06] light:hover:bg-black/[0.04]",
      )}
      data-testid="qa-copy"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

// ============================================================================
// ActionButtons Component
// ============================================================================

export function ActionButtons({
  contentType,
  content,
  onCopy,
  onSave,
  onRun,
  onRetry,
  onAttach,
  onBookmark,
}: ActionButtonsProps) {
  const actions: ActionConfig[] = [];

  switch (contentType) {
    case "code":
      // Copy handled separately with state
      if (onSave) {
        actions.push({
          id: "save",
          label: "Save File",
          icon: <Save className="h-3 w-3" />,
          onClick: () => onSave(content),
        });
      }
      if (onRun) {
        actions.push({
          id: "run",
          label: "Run",
          icon: <Play className="h-3 w-3" />,
          onClick: () => onRun(content),
        });
      }
      break;

    case "screenshot":
      if (onAttach) {
        actions.push({
          id: "attach",
          label: "Attach",
          icon: <Paperclip className="h-3 w-3" />,
          onClick: () => onAttach(content),
        });
      }
      if (onSave) {
        actions.push({
          id: "save",
          label: "Save",
          icon: <Save className="h-3 w-3" />,
          onClick: () => onSave(content),
        });
      }
      break;

    case "text":
      if (onBookmark) {
        actions.push({
          id: "bookmark",
          label: "Bookmark",
          icon: <Bookmark className="h-3 w-3" />,
          onClick: () => onBookmark(content),
        });
      }
      break;

    case "error":
      if (onRetry) {
        actions.push({
          id: "retry",
          label: "Retry",
          icon: <RefreshCw className="h-3 w-3" />,
          onClick: onRetry,
        });
      }
      break;
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Quick actions"
      data-testid="action-buttons"
    >
      {/* Copy always first */}
      <CopyButton content={content} onCopy={onCopy} />

      {/* Contextual actions */}
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          title={action.label}
          aria-label={action.label}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium",
            "dark:text-mac-secondary-label light:text-gray-600",
            "dark:hover:bg-white/[0.06] light:hover:bg-black/[0.04]",
            "transition-all duration-150 active:scale-[0.95]",
          )}
          data-testid={`qa-${action.id}`}
        >
          {action.icon} {action.label}
        </button>
      ))}

      {/* Error gets special copy button for "Copy Error" */}
      {contentType === "error" && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
            } catch {
              // Clipboard unavailable
            }
          }}
          title="Copy Error"
          aria-label="Copy Error"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium",
            "dark:text-mac-secondary-label light:text-gray-600",
            "dark:hover:bg-white/[0.06] light:hover:bg-black/[0.04]",
            "transition-all duration-150 active:scale-[0.95]",
          )}
          data-testid="qa-copy-error"
        >
          <AlertCircle className="h-3 w-3" /> Copy Error
        </button>
      )}
    </div>
  );
}
