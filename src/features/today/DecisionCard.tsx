/**
 * DecisionCard.tsx — Decision text + context excerpt + source session link.
 *
 * Glass card with decision extracted from conversation.
 */
import { MessageSquare } from "lucide-react";
import type { PendingDecision } from "./use-today";
import { formatRelativeTime } from "./use-today";

interface DecisionCardProps {
  decision: PendingDecision;
  onOpenSession: (sessionId: string) => void;
}

export function DecisionCard({ decision, onOpenSession }: DecisionCardProps) {
  return (
    <div
      className="glass-surface rounded-xl px-3.5 py-3 transition-all duration-200 hover:border-white/[0.22]"
      data-testid="decision-card"
    >
      {/* Decision text */}
      <p className="text-[13px] leading-[18px] dark:text-mac-label light:text-black font-medium">
        {decision.text}
      </p>

      {/* Context excerpt */}
      {decision.context && decision.context !== decision.text && (
        <p className="text-[12px] leading-[16px] dark:text-mac-tertiary-label light:text-gray-400 mt-1.5 line-clamp-2">
          {decision.context}
        </p>
      )}

      {/* Source session link */}
      <button
        onClick={() => onOpenSession(decision.sessionId)}
        className="flex items-center gap-1.5 mt-2 text-[11px] dark:text-mac-accent light:text-blue-600 hover:opacity-80 transition-opacity"
        aria-label={`Open session ${decision.sessionId.slice(0, 8)}`}
      >
        <MessageSquare className="w-3 h-3" />
        <span>Session {decision.sessionId.slice(0, 8)}…</span>
        <span className="dark:text-mac-tertiary-label light:text-gray-400 ml-1">
          {formatRelativeTime(decision.timestamp)}
        </span>
      </button>
    </div>
  );
}
