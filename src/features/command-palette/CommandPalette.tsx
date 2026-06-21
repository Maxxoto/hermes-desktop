/**
 * CommandPalette.tsx — Cmd+K / Ctrl+K quick-launcher
 * 
 * Glass design with Apple Liquid Glass patterns:
 * - Layered gradient backgrounds
 * - Subtle reflection overlays
 * - Controlled blur intensity
 * - Inset shadows for edge definition
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import {
  Search,
  Plus,
  Sun,
  Download,
  LogOut,
  Clipboard,
  Settings,
  MessageSquare,
  PanelLeftClose,
  SearchCode,
  Sparkles,
  Hash,
  Bookmark,
} from "lucide-react";
import type { Session } from "../connection/gateway-api";
import { useBookmarkStore } from "../blocks/use-bookmarks";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  currentSessionId: string | null;
  actions: {
    onNewSession: () => void;
    onToggleTheme: () => void;
    onExportChat: () => void;
    onDisconnect: () => void;
    onCopySessionId: () => void;
    onGoToSettings: () => void;
    onGoToCurrentSession: () => void;
    onSelectSession: (id: string) => void;
  };
}

function formatLastActive(epochSec: number): string {
  const diff = Date.now() / 1000 - epochSec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CommandPalette({
  open,
  onClose,
  sessions,
  currentSessionId,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const fuse = useMemo(
    () =>
      new Fuse(sessions, {
        keys: ["title", "model", "source"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, sessions, query]);

  const handleSelect = useCallback(
    (value: string) => {
      const [type, id] = value.split(":");
      switch (type) {
        case "session":
          if (id) actions.onSelectSession(id);
          break;
        case "new":
          actions.onNewSession();
          break;
        case "theme":
          actions.onToggleTheme();
          break;
        case "export":
          actions.onExportChat();
          break;
        case "disconnect":
          actions.onDisconnect();
          break;
        case "copyid":
          actions.onCopySessionId();
          break;
        case "settings":
          actions.onGoToSettings();
          break;
        case "focus":
          actions.onGoToCurrentSession();
          break;
      }
      onClose();
    },
    [actions, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      data-testid="command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDownCapture={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Backdrop — glass blur */}
      <div className="absolute inset-0 backdrop-blur-md" 
        style={{ background: "rgba(0, 0, 0, 0.5)" }} />

      {/* Card — glass surface with reflection */}
      <div
        className="relative w-[90vw] max-w-[560px] max-h-[50vh] flex flex-col
                   rounded-2xl overflow-hidden
                   animate-cmdk-scale"
        style={{
          background: "var(--glass-gradient-dark)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: "1px solid var(--glass-border-color)",
          boxShadow: `
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.06)
          `,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reflection overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: "var(--glass-reflection)", opacity: 0.3 }} />

        <Command
          shouldFilter={false}
          loop
          label="Command Palette"
          className="flex flex-col relative min-h-0 overflow-hidden flex-1"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 glass-border-b">
            <Search className="w-4 h-4 dark:text-mac-tertiary-label light:text-gray-400 flex-shrink-0" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search sessions, actions..."
              className="flex-1 h-[28px] bg-transparent border-none outline-none
                         text-[14px] leading-4 dark:text-mac-label light:text-black
                         placeholder:text-mac-tertiary-label
                         caret-[var(--mac-accent)]"
            />
            <kbd className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 
                           px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255, 255, 255, 0.06)" }}>
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="flex-1 overflow-y-auto min-h-0 py-2">
            {filteredSessions.length === 0 && query.trim() && (
              <div className="px-4 py-8 text-center text-[13px] text-mac-tertiary-label">
                No results found
              </div>
            )}

            {/* Sessions */}
            {filteredSessions.length > 0 && (
              <Command.Group
                heading="Sessions"
                className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2
                           [&_[cmdk-group-heading]]:text-[11px]
                           [&_[cmdk-group-heading]]:font-semibold
                           [&_[cmdk-group-heading]]:tracking-wide
                           [&_[cmdk-group-heading]]:uppercase
                           [&_[cmdk-group-heading]]:text-mac-tertiary-label"
              >
                {filteredSessions.slice(0, 10).map((s) => (
                  <SessionResult
                    key={s.id}
                    session={s}
                    isActive={s.id === currentSessionId}
                    onSelect={handleSelect}
                  />
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2
                         [&_[cmdk-group-heading]]:text-[11px]
                         [&_[cmdk-group-heading]]:font-semibold
                         [&_[cmdk-group-heading]]:tracking-wide
                         [&_[cmdk-group-heading]]:uppercase
                         [&_[cmdk-group-heading]]:text-mac-tertiary-label"
            >
              <ActionRow
                value="new"
                icon={<Plus className="w-4 h-4" />}
                label="New Chat"
                shortcut="⌘N"
                onSelect={handleSelect}
              />
              <ActionRow
                value="theme"
                icon={<Sun className="w-4 h-4" />}
                label="Toggle Theme"
                onSelect={handleSelect}
              />
              <ActionRow
                value="toggle-sidebar"
                icon={<PanelLeftClose className="w-4 h-4" />}
                label="Toggle Sidebar"
                shortcut="⌘B"
                disabled
                onSelect={handleSelect}
              />
              <ActionRow
                value="full-search"
                icon={<SearchCode className="w-4 h-4" />}
                label="Full Search"
                shortcut="⌘⇧F"
                disabled
                onSelect={handleSelect}
              />
              <ActionRow
                value="overlay"
                icon={<Sparkles className="w-4 h-4" />}
                label="Toggle Overlay"
                shortcut="⌘."
                disabled
                onSelect={handleSelect}
              />
              <ActionRow
                value="switch-space"
                icon={<Hash className="w-4 h-4" />}
                label="Switch Space"
                shortcut="⌘1-4"
                disabled
                onSelect={handleSelect}
              />
              <ActionRow
                value="export"
                icon={<Download className="w-4 h-4" />}
                label="Export Chat"
                shortcut="⌘⇧E"
                disabled={!currentSessionId}
                onSelect={handleSelect}
              />
              <ActionRow
                value="copyid"
                icon={<Clipboard className="w-4 h-4" />}
                label="Copy Session ID"
                disabled={!currentSessionId}
                onSelect={handleSelect}
              />
              <ActionRow
                value="disconnect"
                icon={<LogOut className="w-4 h-4" />}
                label="Disconnect"
                destructive
                onSelect={handleSelect}
              />
            </Command.Group>

            {/* Navigation */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2
                         [&_[cmdk-group-heading]]:text-[11px]
                         [&_[cmdk-group-heading]]:font-semibold
                         [&_[cmdk-group-heading]]:tracking-wide
                         [&_[cmdk-group-heading]]:uppercase
                         [&_[cmdk-group-heading]]:text-mac-tertiary-label"
            >
              <ActionRow
                value="settings"
                icon={<Settings className="w-4 h-4" />}
                label="Go to Settings"
                onSelect={handleSelect}
              />
              <ActionRow
                value="focus"
                icon={<MessageSquare className="w-4 h-4" />}
                label="Go to Current Session"
                disabled={!currentSessionId}
                onSelect={handleSelect}
              />
            </Command.Group>

            {/* Bookmarks */}
            <BookmarksGroup />
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function SessionResult({
  session,
  isActive,
  onSelect,
}: {
  session: Session;
  isActive: boolean;
  onSelect: (value: string) => void;
}) {
  const title = session.title || `Session ${session.id.slice(0, 8)}`;
  return (
    <Command.Item
      value={`session:${session.id}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-4 h-[36px] rounded-lg mx-2
                 text-[13px] leading-4 text-mac-label
                 cursor-default transition-all duration-150
                 data-[selected=true]:text-mac-accent data-[selected=true]:bg-white/[0.06]"
      style={{
        background: "transparent",
      }}
      data-selected-style="true"
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{title}</div>
      </div>
      <span className="flex-shrink-0 text-[10px] text-mac-tertiary-label">
        {session.message_count} msg
      </span>
      <span className="flex-shrink-0 text-[10px] text-mac-tertiary-label">
        {formatLastActive(session.last_active)}
      </span>
      {isActive && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full glow-accent"
          style={{ background: "var(--mac-accent)" }} />
      )}
    </Command.Item>
  );
}

function ActionRow({
  value,
  icon,
  label,
  shortcut,
  disabled,
  destructive,
  onSelect,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      className={`flex items-center gap-3 px-4 h-[36px] rounded-lg mx-2
                  text-[13px] leading-4 cursor-default transition-all duration-150
                  ${destructive ? "text-mac-red" : "text-mac-label"}
                  aria-disabled:opacity-40`}
    >
      <span className="flex-shrink-0 opacity-60">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {shortcut && (
        <span className="flex-shrink-0 text-[10px] text-mac-tertiary-label">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}

function BookmarksGroup() {
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  if (bookmarks.length === 0) return null;

  return (
    <Command.Group
      heading={`Bookmarks (${bookmarks.length})`}
      className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2
                 [&_[cmdk-group-heading]]:text-[11px]
                 [&_[cmdk-group-heading]]:font-semibold
                 [&_[cmdk-group-heading]]:tracking-wide
                 [&_[cmdk-group-heading]]:uppercase
                 [&_[cmdk-group-heading]]:text-mac-tertiary-label"
    >
      {bookmarks.slice(0, 10).map((bm) => (
        <Command.Item
          key={bm.id}
          value={`bookmark:${bm.id}`}
          className="flex items-center gap-3 px-4 h-[36px] rounded-lg mx-2
                     text-[13px] leading-4 text-mac-label
                     cursor-default transition-all duration-150
                     data-[selected=true]:text-mac-accent data-[selected=true]:bg-white/[0.06]"
          style={{ background: "transparent" }}
        >
          <Bookmark className="w-4 h-4 flex-shrink-0 opacity-50 dark:text-mac-orange light:text-orange-500" />
          <div className="flex-1 min-w-0">
            <div className="truncate">{bm.content.slice(0, 80)}</div>
          </div>
          <span className="flex-shrink-0 text-[10px] text-mac-tertiary-label">
            {new Date(bm.timestamp).toLocaleDateString()}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

export function useCommandPaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}
