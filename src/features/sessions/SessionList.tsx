import { useState, useMemo, useRef, useEffect } from 'react';
import { MessageSquarePlus, Search, MessageSquare } from 'lucide-react';
import { useSessions } from './use-sessions';
import SessionItem from './SessionItem';
import type { Session } from '../connection/gateway-api';

interface SessionListProps {
  activeSessionId?: string | null;
  onSelectSession: (id: string) => void;
  onNewChat?: () => void;
}

type DateGroup = 'Today' | 'Yesterday' | 'Older';

function getDateGroup(epochSec: number): DateGroup {
  const now = new Date();
  const date = new Date(epochSec * 1000);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  if (date >= todayStart) return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  return 'Older';
}

function groupSessions(sessions: Session[]): [DateGroup, Session[]][] {
  const groups = new Map<DateGroup, Session[]>();

  for (const session of sessions) {
    const group = getDateGroup(session.last_active);
    const list = groups.get(group);
    if (list) {
      list.push(session);
    } else {
      groups.set(group, [session]);
    }
  }

  // Sort sessions within each group by updated_at descending (most recent first)
  for (const [, sessions] of groups) {
    sessions.sort(
      (a, b) => b.last_active - a.last_active,
    );
  }

  const order: DateGroup[] = ['Today', 'Yesterday', 'Older'];
  return order
    .filter((key) => groups.has(key))
    .map((key) => [key, groups.get(key)!]);
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2 animate-pulse px-0 py-1">
          <div className="w-4 h-4 rounded bg-white/10 dark:bg-white/10 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 bg-white/10 dark:bg-white/10 rounded w-3/5" />
              <div className="h-3 w-8 bg-white/5 dark:bg-white/5 rounded" />
            </div>
            <div className="h-3 bg-white/5 dark:bg-white/5 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12">
      <MessageSquare className="w-10 h-10 dark:text-mac-tertiary-label light:text-gray-400 mb-3" />
      <p className="text-[13px] dark:text-mac-secondary-label light:text-gray-600">No conversations yet</p>
      <p className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 mt-1">
        Start a new chat to begin
      </p>
    </div>
  );
}

export default function SessionList({
  activeSessionId,
  onSelectSession,
  onNewChat,
}: SessionListProps) {
  const { data: sessions, isLoading } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen for Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener('hermes:focus-search', handleFocusSearch);
    return () => window.removeEventListener('hermes:focus-search', handleFocusSearch);
  }, []);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      if (s.title && s.title.toLowerCase().includes(query)) return true;
      if (s.model && s.model.toLowerCase().includes(query)) return true;
      if (s.source && s.source.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [sessions, searchQuery]);

  const grouped = useMemo(
    () => groupSessions(filteredSessions),
    [filteredSessions],
  );

  return (
    <div className="sidebar flex flex-col h-full dark:text-mac-label light:text-black">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className="mac-btn mac-btn-primary w-full flex items-center justify-center gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 dark:text-mac-tertiary-label light:text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && searchQuery) {
                e.stopPropagation();
                setSearchQuery("");
              }
            }}
            className="w-full h-[26px] pl-7 pr-2 glass-input
              dark:text-mac-label light:text-black
              text-[13px] dark:placeholder:text-mac-tertiary-label light:placeholder:text-gray-400
              outline-none transition-all"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <LoadingSkeleton />
        ) : grouped.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="pb-2">
            {grouped.map(([group, groupSessions]) => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide
                  dark:text-mac-tertiary-label light:text-gray-500 uppercase select-none">
                  {group}
                </div>
                {groupSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    onClick={() => onSelectSession(session.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
