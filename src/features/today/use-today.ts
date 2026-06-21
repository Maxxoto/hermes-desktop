/**
 * use-today.ts — AI-powered Today View hook
 *
 * Fetches recent sessions, extracts pending decisions and action items
 * from messages using heuristic regex patterns. Surfaces what matters right now.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getGatewayClient,
  type Session,
  type SessionMessage,
} from "../connection/gateway-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingDecision {
  id: string;
  text: string;
  context: string;
  sessionId: string;
  timestamp: number;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  sessionId: string;
  timestamp: number;
}

export interface PinnedSession {
  id: string;
  title: string;
  messageCount: number;
  lastActive: number;
}

export interface ActivityEntry {
  id: string;
  text: string;
  timestamp: number;
  sessionId: string;
}

export interface TodayData {
  pendingDecisions: PendingDecision[];
  actionItems: ActionItem[];
  pinnedSessions: PinnedSession[];
  recentActivity: ActivityEntry[];
}

// ---------------------------------------------------------------------------
// Heuristic patterns
// ---------------------------------------------------------------------------

/** Patterns that indicate a decision was made but may still be pending. */
const DECISION_PATTERNS = [
  /\b(?:we decided|decided to|decision[:\s]|let'?s go with|going with|we'?ll use)\b/i,
  /\b(?:should we|shouldn'?t we|shall we|do we (?:want|need|use)|which one)\b/i,
  /\b(?:trade-?off|pros?\s*(?:and|&|vs\.?)\s*cons?|alternatives?\s*[:?])\b/i,
];

/** Patterns that indicate an actionable to-do item. */
const ACTION_PATTERNS = [
  /\b(?:TODO|FIXME|HACK|ACTION[:\s])\b/,
  /\b(?:need to|needs? to|must|have to|should|ought to)\b/i,
  /\b(?:don'?t forget|remember to|make sure|follow up|follow-up)\b/i,
  /\b(?:create|build|implement|fix|update|add|remove|refactor|deploy)\b/i,
];

/** Truncate text and add ellipsis. */
function truncate(text: string, maxLen: number): string {
  const trimmed = text.trim().replace(/\n+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "…";
}

/** Get context excerpt around a match — surrounding sentence. */
function getContextExcerpt(
  content: string,
  matchStart: number,
  matchEnd: number,
  radius = 120
): string {
  const start = Math.max(0, matchStart - radius);
  const end = Math.min(content.length, matchEnd + radius);
  let excerpt = content.slice(start, end).trim();
  if (start > 0) excerpt = "…" + excerpt;
  if (end < content.length) excerpt = excerpt + "…";
  return excerpt;
}

// ---------------------------------------------------------------------------
// Extraction logic
// ---------------------------------------------------------------------------

export function extractDecisions(
  content: string,
  sessionId: string,
  timestamp: number
): PendingDecision[] {
  const decisions: PendingDecision[] = [];
  for (const pattern of DECISION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      // Find the full sentence containing the match
      const sentenceStart = content.lastIndexOf(".", match.index - 1) + 1;
      const sentenceEnd = content.indexOf(".", match.index + match[0].length);
      const end = sentenceEnd === -1 ? content.length : sentenceEnd + 1;
      const sentence = content.slice(sentenceStart, end).trim();
      if (sentence.length > 5) {
        decisions.push({
          id: `dec_${sessionId}_${match.index}`,
          text: truncate(sentence, 200),
          context: getContextExcerpt(content, match.index, match.index + match[0].length),
          sessionId,
          timestamp,
        });
      }
    }
  }
  return decisions;
}

export function extractActionItems(
  content: string,
  sessionId: string,
  timestamp: number
): ActionItem[] {
  const items: ActionItem[] = [];
  for (const pattern of ACTION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      // Find the full sentence
      const sentenceStart = content.lastIndexOf(".", match.index - 1) + 1;
      const sentenceEnd = content.indexOf(".", match.index + match[0].length);
      const end = sentenceEnd === -1 ? content.length : sentenceEnd + 1;
      const sentence = content.slice(sentenceStart, end).trim();
      if (sentence.length > 5) {
        items.push({
          id: `act_${sessionId}_${match.index}`,
          text: truncate(sentence, 200),
          completed: false,
          sessionId,
          timestamp,
        });
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Session fetching — fetch recent sessions + their messages
// ---------------------------------------------------------------------------

const MAX_SESSIONS_TO_SCAN = 10;
const MAX_RECENT_ACTIVITY = 20;

export function useTodayData(): {
  data: TodayData;
  isLoading: boolean;
  error: Error | null;
} {
  // 1. Fetch recent sessions
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: () => getGatewayClient().listSessions(),
    refetchInterval: 30_000,
  });

  // 2. Fetch messages for the N most recent sessions
  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => b.last_active - a.last_active)
        .slice(0, MAX_SESSIONS_TO_SCAN),
    [sessions]
  );

  // We fetch messages for each recent session individually
  // Using individual queries per session ID
  const sessionQueries = recentSessions.map((session) => ({
    queryKey: ["session-messages", session.id],
    queryFn: () => getGatewayClient().getSessionMessages(session.id),
    enabled: !sessionsLoading,
  }));

  // Use react-query's result — but since we need multiple queries, we do a
  // simpler approach: combine into a single derived computation from a flat
  // query that fetches all recent session messages.
  const {
    data: allSessionMessages,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery<{ sessionId: string; messages: SessionMessage[] }[]>({
    queryKey: ["today-scan", ...recentSessions.map((s) => s.id)],
    queryFn: async () => {
      const results = await Promise.all(
        recentSessions.map(async (session) => {
          try {
            const messages = await getGatewayClient().getSessionMessages(
              session.id
            );
            return { sessionId: session.id, messages };
          } catch {
            return { sessionId: session.id, messages: [] };
          }
        })
      );
      return results;
    },
    enabled: !sessionsLoading && recentSessions.length > 0,
    refetchInterval: 60_000,
  });

  // 3. Extract data from messages
  const todayData = useMemo<TodayData>(() => {
    const pendingDecisions: PendingDecision[] = [];
    const actionItems: ActionItem[] = [];
    const recentActivity: ActivityEntry[] = [];

    if (allSessionMessages) {
      for (const { sessionId, messages } of allSessionMessages) {
        for (const msg of messages) {
          if (msg.role === "system") continue;

          // Extract decisions (from assistant messages)
          if (msg.role === "assistant") {
            pendingDecisions.push(
              ...extractDecisions(msg.content, sessionId, msg.timestamp)
            );
          }

          // Extract action items (from both roles)
          actionItems.push(
            ...extractActionItems(msg.content, sessionId, msg.timestamp)
          );

          // Collect recent activity (all messages)
          if (msg.content.trim().length > 0) {
            recentActivity.push({
              id: `act_${sessionId}_${msg.id}`,
              text: truncate(msg.content, 120),
              timestamp: msg.timestamp,
              sessionId,
            });
          }
        }
      }
    }

    // Pinned sessions = most active recent sessions
    const pinnedSessions: PinnedSession[] = recentSessions.map((s) => ({
      id: s.id,
      title: s.title || `Session ${s.id.slice(0, 8)}`,
      messageCount: s.message_count,
      lastActive: s.last_active,
    }));

    // Sort: most recent activity first, limit
    recentActivity.sort((a, b) => b.timestamp - a.timestamp);

    return {
      pendingDecisions: pendingDecisions.slice(0, 10),
      actionItems: actionItems.slice(0, 15),
      pinnedSessions,
      recentActivity: recentActivity.slice(0, MAX_RECENT_ACTIVITY),
    };
  }, [allSessionMessages, recentSessions]);

  return {
    data: todayData,
    isLoading: sessionsLoading || messagesLoading,
    error: sessionsError || messagesError,
  };
}

// ---------------------------------------------------------------------------
// Relative time formatting
// ---------------------------------------------------------------------------

export function formatRelativeTime(epochSec: number): string {
  const diff = Date.now() / 1000 - epochSec;
  if (diff < 0) return "just now";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
