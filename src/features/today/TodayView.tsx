/**
 * TodayView.tsx — AI-powered Today View (EPIC 12)
 *
 * Like Things 3 — surfaces what matters right now:
 * - Pending Decisions
 * - Action Items
 * - Pinned Sessions
 * - Recent Activity
 *
 * Design: Glass cards, 13px body, 14px headings, centered 480px max-width,
 * scrollable. Empty states with friendly messages.
 */
import { useCallback } from "react";
import { Sun, Calendar, AlertCircle, RotateCcw } from "lucide-react";
import { useTodayData } from "./use-today";
import { ActionItem } from "./ActionItem";
import { DecisionCard } from "./DecisionCard";
import { PinnedSessions } from "./PinnedSessions";
import { RecentActivity } from "./RecentActivity";
import { useTodayStore } from "./use-today-store";

interface TodayViewProps {
  onOpenSession: (sessionId: string) => void;
}

export default function TodayView({ onOpenSession }: TodayViewProps) {
  const { data, isLoading, error } = useTodayData();
  const toggleTodayView = useTodayStore((s) => s.toggleTodayView);

  // Action item toggle — optimistic local state
  const handleToggleAction = useCallback((id: string) => {
    // In a full implementation this would persist to the store
    // For now we dispatch a custom event for local state management
    window.dispatchEvent(
      new CustomEvent("today:toggle-action", { detail: { id } })
    );
  }, []);

  const greeting = getGreeting();
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-6"
      data-testid="today-view"
      role="main"
      aria-label="Today view"
    >
      <div className="max-w-[480px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1
              className="text-[18px] font-semibold dark:text-mac-label light:text-black"
              data-testid="today-heading"
            >
              {greeting}
            </h1>
            <button
              onClick={toggleTodayView}
              className="mac-icon-btn"
              title="Close Today view"
              aria-label="Close Today view"
              data-testid="today-close"
            >
              <Sun className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[12px] dark:text-mac-tertiary-label light:text-gray-400">
            <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />
            {dateStr}
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center py-12 dark:text-mac-tertiary-label light:text-gray-400">
            <div className="w-5 h-5 border-2 border-white/20 border-t-mac-accent rounded-full animate-spin mb-3" />
            <p className="text-[13px]">Loading your day…</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center py-12 dark:text-mac-red light:text-red-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-[13px] font-medium">Something went wrong</p>
            <p className="text-[11px] mt-1 opacity-60 dark:text-mac-tertiary-label light:text-gray-400">
              Could not load today's data
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mac-btn mt-3 text-[12px]"
            >
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Retry
            </button>
          </div>
        )}

        {/* Content sections */}
        {!isLoading && !error && (
          <>
            {/* ── Pending Decisions ─────────────────────────────── */}
            <Section
              title="Pending Decisions"
              count={data.pendingDecisions.length}
              emptyMessage="No pending decisions"
              emptySubtext="Decisions from your conversations will appear here"
              emptyIcon="🤔"
            >
              <div className="flex flex-col gap-2">
                {data.pendingDecisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    onOpenSession={onOpenSession}
                  />
                ))}
              </div>
            </Section>

            {/* ── Action Items ──────────────────────────────────── */}
            <Section
              title="Action Items"
              count={data.actionItems.length}
              emptyMessage="All clear"
              emptySubtext="No action items to worry about right now"
              emptyIcon="✅"
            >
              <div className="glass-surface rounded-xl overflow-hidden divide-y divide-white/[0.06]">
                {data.actionItems.map((item) => (
                  <ActionItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggleAction}
                  />
                ))}
              </div>
            </Section>

            {/* ── Pinned Sessions ───────────────────────────────── */}
            <Section
              title="Recent Sessions"
              count={data.pinnedSessions.length}
              emptyMessage="No sessions"
              emptySubtext="Start a conversation to see your recent sessions"
              emptyIcon="💬"
            >
              <div className="glass-surface rounded-xl overflow-hidden divide-y divide-white/[0.06]">
                <PinnedSessions
                  sessions={data.pinnedSessions}
                  onOpenSession={onOpenSession}
                />
              </div>
            </Section>

            {/* ── Recent Activity ───────────────────────────────── */}
            <Section
              title="Recent Activity"
              count={data.recentActivity.length}
              emptyMessage="Nothing yet"
              emptySubtext="Your recent messages will appear here"
              emptyIcon="📋"
            >
              <div className="glass-surface rounded-xl overflow-hidden divide-y divide-white/[0.06]">
                <RecentActivity
                  entries={data.recentActivity}
                  onOpenSession={onOpenSession}
                />
              </div>
            </Section>

            {/* Keyboard shortcut hint */}
            <div className="text-center mt-8 mb-4">
              <p className="text-[11px] dark:text-mac-quaternary-label light:text-gray-300">
                Press{" "}
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  ⌘T
                </kbd>{" "}
                to toggle this view
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section helper
// ---------------------------------------------------------------------------

function Section({
  title,
  count,
  emptyMessage,
  emptySubtext,
  emptyIcon,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  emptySubtext: string;
  emptyIcon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[14px] font-semibold dark:text-mac-label light:text-black">
          {title}
        </h2>
        {count > 0 && (
          <span
            className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400 tabular-nums"
            data-testid={`count-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {count}
          </span>
        )}
      </div>

      {count > 0 ? (
        children
      ) : (
        <div
          className="flex flex-col items-center py-6 dark:text-mac-tertiary-label light:text-gray-400"
          data-testid={`empty-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <span className="text-2xl mb-2 opacity-60">{emptyIcon}</span>
          <p className="text-[13px]">{emptyMessage}</p>
          <p className="text-[11px] mt-1 opacity-60">{emptySubtext}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
