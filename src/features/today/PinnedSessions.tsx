/**
 * PinnedSessions.tsx — Session list with message count + last active time.
 *
 * Shows the most recently active sessions at a glance.
 */
import { MessageSquare, Clock } from "lucide-react";
import type { PinnedSession } from "./use-today";
import { formatRelativeTime } from "./use-today";

interface PinnedSessionsProps {
  sessions: PinnedSession[];
  onOpenSession: (sessionId: string) => void;
}

export function PinnedSessions({ sessions, onOpenSession }: PinnedSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-8 dark:text-mac-tertiary-label light:text-gray-400"
        data-testid="pinned-sessions-empty"
      >
        <Clock className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-[13px]">No recent sessions yet</p>
        <p className="text-[11px] mt-1 opacity-60">
          Start a conversation to see your sessions here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" data-testid="pinned-sessions">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onOpenSession(session.id)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.04]"
          aria-label={`Open ${session.title}`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0 dark:text-mac-blue light:text-blue-600 opacity-60" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] leading-[18px] dark:text-mac-label light:text-black truncate font-medium">
              {session.title}
            </div>
          </div>
          <span className="flex-shrink-0 text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
            {session.messageCount} msg
          </span>
          <span className="flex-shrink-0 text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
            {formatRelativeTime(session.lastActive)}
          </span>
        </button>
      ))}
    </div>
  );
}
