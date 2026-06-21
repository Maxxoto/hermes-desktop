import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { type ToolCall } from "../chat/use-chat-store";

export interface ToolCallBlockProps {
  toolCall: ToolCall;
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = toolCall.args || toolCall.tool;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might not be available
    }
  }, [toolCall.args, toolCall.tool]);

  const statusIcon =
    toolCall.status === "running" ? (
      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    ) : toolCall.status === "completed" ? (
      <span className="text-mac-green">✓</span>
    ) : (
      <span className="text-mac-red">✗</span>
    );

  const statusColor =
    toolCall.status === "running"
      ? "dark:bg-mac-blue/10 dark:border-mac-blue/20"
      : toolCall.status === "completed"
        ? "dark:bg-mac-green/10 dark:border-mac-green/20"
        : "dark:bg-mac-red/10 dark:border-mac-red/20";

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden my-1.5",
        statusColor,
        "dark:border-white/[0.08] light:border-black/[0.08]",
      )}
      data-testid="tool-call-block"
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5",
          "text-left text-[12px] font-medium",
          "dark:text-mac-secondary-label light:text-gray-600",
          "hover:dark:bg-white/[0.03] hover:light:bg-black/[0.02]",
          "transition-colors duration-150",
          "cursor-default",
        )}
        data-testid="tool-call-toggle"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        {statusIcon}
        <span className="opacity-60">🔧</span>
        <span className="font-mono">{toolCall.tool}</span>
        {toolCall.status === "running" && (
          <span className="opacity-50 ml-auto">running…</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && toolCall.args && (
        <div className="border-t dark:border-white/[0.06] light:border-black/[0.06]">
          <div className="relative px-3 py-2">
            <pre className="text-[11px] font-mono dark:text-mac-secondary-label light:text-gray-600 whitespace-pre-wrap break-all">
              {toolCall.args}
            </pre>
            <button
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy output"}
              aria-label={copied ? "Copied!" : "Copy output"}
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                "transition-all duration-150 active:scale-[0.95]",
                "backdrop-blur-sm",
                "dark:bg-white/[0.06] light:bg-black/[0.04]",
                "dark:border-white/[0.08] light:border-black/[0.06]",
                "border",
                copied
                  ? "dark:text-mac-green light:text-green-600"
                  : "dark:text-mac-tertiary-label light:text-gray-400",
              )}
              data-testid="tool-copy-btn"
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
          </div>
        </div>
      )}
    </div>
  );
}
