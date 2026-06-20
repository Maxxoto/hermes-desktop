import { type ToolCall } from "./use-chat-store";
import { cn } from "../../lib/utils";

interface ToolProgressProps {
  toolCalls: ToolCall[];
}

export function ToolProgress({ toolCalls }: ToolProgressProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {toolCalls.map((tc, i) => (
        <span
          key={`${tc.tool}-${i}`}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors border",
            tc.status === "running" &&
              "dark:bg-mac-blue/20 dark:text-mac-blue dark:border-mac-blue/30 light:bg-blue-500/15 light:text-blue-600 light:border-blue-500/30",
            tc.status === "completed" &&
              "dark:bg-mac-green/20 dark:text-mac-green dark:border-mac-green/30 light:bg-green-500/15 light:text-green-600 light:border-green-500/30",
            tc.status === "failed" &&
              "dark:bg-mac-red/20 dark:text-mac-red dark:border-mac-red/30 light:bg-red-500/15 light:text-red-600 light:border-red-500/30"
          )}
        >
          {tc.status === "running" && (
            <svg
              className="animate-spin h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {tc.status === "completed" && <span>✓</span>}
          {tc.status === "failed" && <span>✗</span>}
          <span>{tc.tool}</span>
          {tc.status === "running" && <span className="opacity-70">…</span>}
        </span>
      ))}
    </div>
  );
}
