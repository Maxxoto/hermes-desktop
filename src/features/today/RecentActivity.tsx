/**
 * RecentActivity.tsx — Activity feed with relative timestamps.
 *
 * Shows the most recent messages across all sessions.
 */
import { MessageSquare } from "lucide-react";
import type { ActivityEntry } from "./use-today";
import { formatRelativeTime } from "./use-today";

interface RecentActivityProps {
  entries: ActivityEntry[];
  onOpenSession: (sessionId: string) => void;
}

export function RecentActivity({ entries, onOpenSession }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-8 dark:text-mac-tertiary-label light:text-gray-400"
        data-testid="recent-activity-empty"
      >
        <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-[13px]">Nothing recent yet</p>
        <p className="text-[11px] mt-1 opacity-60">
          Your activity will appear here as you chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" data-testid="recent-activity">
      {entries.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onOpenSession(entry.sessionId)}
          className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.04]"
          aria-label={`Open activity in session ${entry.sessionId.slice(0, 8)}`}
        >
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-[2px] dark:text-mac-tertiary-label light:text-gray-400 opacity-50" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-[18px] dark:text-mac-label light:text-black line-clamp-2">
              {entry.text}
            </p>
          </div>
          <span className="flex-shrink-0 text-[11px] dark:text-mac-tertiary-label light:text-gray-400 mt-[1px]">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </button>
      ))}
    </div>
  );
}
