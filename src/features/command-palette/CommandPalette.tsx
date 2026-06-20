/**
 * CommandPalette.tsx — Cmd+K / Ctrl+K quick-launcher
 *
 * Full-screen overlay (backdrop blur) with a centered card. Three categories:
 * Sessions (fuzzy-matched via fuse.js), Actions, and Navigation.
 *
 * Uses `cmdk` primitives for keyboard navigation (arrows, Enter, Esc) and
 * accessibility. The built-in cmdk filter is disabled so we can run fuse.js
 * for sessions while keeping actions/navigation always-visible.
 *
 * All styling follows UI-UX-DESIGN-SPEC.md (macOS-native tokens, 13px body).
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
} from "lucide-react";
import type { Session } from "../connection/gateway-api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  /** Whether the palette overlay is visible. */
  open: boolean;
  /** Called when the palette requests to close (Esc, backdrop click, selection). */
  onClose: () => void;
  /** All known sessions from the gateway (for fuzzy search). */
  sessions: Session[];
  /** The currently active session id (null = no session). */
  currentSessionId: string | null;
  /** Action callbacks. */
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Relative-time formatter (e.g. "3m ago", "2h ago", "Jan 5"). */
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

// ── Component ──────────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onClose,
  sessions,
  currentSessionId,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset query every time the palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  // Auto-focus the search input on open
  useEffect(() => {
    if (open) {
      // Defer to next tick so cmdk has mounted the input
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Fuse.js instance for fuzzy session search
  const fuse = useMemo(
    () =>
      new Fuse(sessions, {
        keys: ["title", "model", "source"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [sessions],
  );

  // Filtered sessions based on the current query
  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, sessions, query]);

  // ── Selection handlers ───────────────────────────────────────────────────

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
    [actions, onClose],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      data-testid="command-palette-overlay"
      onClick={(e) => {
        // Close on backdrop click (click on the overlay itself, not its children)
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/40" />

      {/* Card — glass panel */}
      <div
        className="relative w-[90vw] max-w-[640px] max-h-[60vh] flex flex-col
                   rounded-xl overflow-hidden
                   glass-surface
                   shadow-[0_24px_80px_rgba(0,0,0,0.6)]
                   animate-cmdk-scale select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          loop
          label="Command Palette"
          className="flex flex-col"
        >
          {/* Search input row */}
          <div
            className="flex items-center gap-2 px-3 glass-border-b"
          >
            <Search className="w-4 h-4 text-[var(--mac-tertiary-label)] flex-shrink-0" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search sessions, actions..."
              className="flex-1 h-[36px] bg-transparent border-none outline-none
                         text-[13px] leading-4 text-[var(--mac-label)]
                         placeholder:text-[var(--mac-tertiary-label)]
                         caret-[var(--mac-accent)]"
            />
          </div>

          {/* Results list */}
          <Command.List className="flex-1 overflow-y-auto min-h-0 py-1">
            {/* Empty state — shown when no items match at all */}
            {filteredSessions.length === 0 && query.trim() && (
              <div className="px-4 py-8 text-center text-[13px] text-[var(--mac-tertiary-label)]">
                No results found
              </div>
            )}

            {/* ── Sessions ─────────────────────────────────────────── */}
            {filteredSessions.length > 0 && (
              <Command.Group
                heading="Sessions"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1
                           [&_[cmdk-group-heading]]:text-[11px]
                           [&_[cmdk-group-heading]]:font-semibold
                           [&_[cmdk-group-heading]]:tracking-wide
                           [&_[cmdk-group-heading]]:uppercase
                           [&_[cmdk-group-heading]]:text-[var(--mac-tertiary-label)]"
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

            {/* ── Actions ──────────────────────────────────────────── */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1
                         [&_[cmdk-group-heading]]:text-[11px]
                         [&_[cmdk-group-heading]]:font-semibold
                         [&_[cmdk-group-heading]]:tracking-wide
                         [&_[cmdk-group-heading]]:uppercase
                         [&_[cmdk-group-heading]]:text-[var(--mac-tertiary-label]]"
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
                value="export"
                icon={<Download className="w-4 h-4" />}
                label="Export Chat"
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

            {/* ── Navigation ──────────────────────────────────────── */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1
                         [&_[cmdk-group-heading]]:text-[11px]
                         [&_[cmdk-group-heading]]:font-semibold
                         [&_[cmdk-group-heading]]:tracking-wide
                         [&_[cmdk-group-heading]]:uppercase
                         [&_[cmdk-group-heading]]:text-[var(--mac-tertiary-label)]"
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
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

/** A session result row with title, model, message count, last-active. */
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
      className="flex items-center gap-2.5 px-3 h-[32px] rounded-[4px] mx-1
                 text-[13px] leading-4 text-[var(--mac-label)]
                 cursor-default transition-colors
                 data-[selected=true]:bg-[rgba(255,255,255,0.1)]
                 data-[selected=true]:text-[var(--mac-accent)]"
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <div className="truncate font-normal">{title}</div>
      </div>
      <span className="flex-shrink-0 text-[10px] text-[var(--mac-tertiary-label)]">
        {session.message_count} msg
      </span>
      <span className="flex-shrink-0 text-[10px] text-[var(--mac-tertiary-label)]">
        {formatLastActive(session.last_active)}
      </span>
      {isActive && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--mac-accent)]" />
      )}
    </Command.Item>
  );
}

/** An action/navigation result row with icon, label, optional shortcut. */
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
      className={`flex items-center gap-2.5 px-3 h-[32px] rounded-[4px] mx-1
                  text-[13px] leading-4 cursor-default transition-colors
                  ${destructive ? "text-[var(--mac-red)]" : "text-[var(--mac-label)]"}
                  data-[selected=true]:bg-[rgba(255,255,255,0.1)]
                  aria-disabled:opacity-40`}
    >
      <span className="flex-shrink-0 opacity-80">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="flex-shrink-0 text-[10px] text-[var(--mac-tertiary-label)]">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}

// ── Keyboard shortcut hook ─────────────────────────────────────────────────

/**
 * useCommandPaletteShortcut — registers a global Cmd+K / Ctrl+K listener
 * that toggles the palette open. Returns nothing; manages its own listener.
 *
 * Uses `(e.metaKey || e.ctrlKey) && e.key === 'k'` to support both macOS
 * and Linux/Windows. Tauri's `__TAURI__` presence indicates macOS native.
 */
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
