import { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Smartphone,
  Globe,
  Bot,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { Session } from "../connection/gateway-api";
import { useRenameSession, useDeleteSession } from "./use-sessions";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const sourceIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  terminal: Terminal,
  cli: Terminal,
  mobile: Smartphone,
  phone: Smartphone,
  web: Globe,
  browser: Globe,
  api: Globe,
};

function getSourceIcon(source: string) {
  const Icon = sourceIconMap[source.toLowerCase()] ?? Bot;
  return Icon;
}

function formatRelativeTime(epochSec: number): string {
  const now = Date.now();
  const then = epochSec * 1000;
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDisplayTitle(session: Session): string {
  if (session.title && session.title.trim().length > 0) {
    return session.title;
  }
  return "New conversation";
}

export default function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  const Icon = getSourceIcon(session.source);
  const renameSession = useRenameSession();
  const deleteSession = useDeleteSession();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // ---- Rename ---------------------------------------------------------------

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(getDisplayTitle(session));
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === getDisplayTitle(session)) {
      setIsEditing(false);
      return;
    }
    renameSession.mutate(
      { id: session.id, title: trimmed },
      { onSettled: () => setIsEditing(false) },
    );
  };

  const cancelRename = () => {
    setIsEditing(false);
    setEditTitle("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  };

  // ---- Delete ---------------------------------------------------------------

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession.mutate(session.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // ---- Render: editing mode -------------------------------------------------

  if (isEditing) {
    return (
      <div
        className={`w-full mx-2 px-3 py-1.5 flex items-center gap-2 rounded-md transition-colors
          ${isActive ? "dark:bg-white/10 light:bg-black/10" : ""}`}
        style={{ width: "calc(100% - 16px)" }}
      >
        <div className="shrink-0">
          <Icon className="w-4 h-4 dark:text-mac-secondary-label light:text-gray-500" />
        </div>
        <input
          ref={editInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={commitRename}
          className="flex-1 min-w-0 h-[22px] px-2 rounded-[4px]
            dark:bg-mac-control dark:border-[rgba(255,255,255,0.1)] dark:text-mac-label
            light:bg-white light:border-gray-300 light:text-black
            border text-[13px] focus:outline-none focus:border-[var(--mac-accent)]
            focus:shadow-[0_0_0_3px_rgba(10,132,255,0.25)]"
        />
        <button
          onClick={commitRename}
          title="Save"
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-green light:text-green-600"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={cancelRename}
          title="Cancel"
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-secondary-label light:text-gray-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Render: delete confirmation mode ------------------------------------

  if (showDeleteConfirm) {
    return (
      <div
        className={`w-full mx-2 px-3 py-1.5 flex items-center gap-2 rounded-md transition-colors
          ${isActive ? "dark:bg-white/10 light:bg-black/10" : ""}`}
        style={{ width: "calc(100% - 16px)" }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[11px] dark:text-mac-red light:text-red-500 truncate block">
            Delete this conversation?
          </span>
        </div>
        <button
          onClick={handleConfirmDelete}
          title="Confirm delete"
          className="mac-btn mac-btn-destructive !h-5 px-2 text-[11px]"
        >
          Delete
        </button>
        <button
          onClick={handleCancelDelete}
          title="Cancel"
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-secondary-label light:text-gray-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Render: normal mode --------------------------------------------------

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={getDisplayTitle(session)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group w-full mx-2 px-3 py-1.5 flex items-start gap-2 rounded-md transition-colors
        ${isActive
          ? "dark:bg-white/10 light:bg-black/10"
          : "dark:hover:bg-white/5 light:hover:bg-black/5"
        }`}
      style={{ width: "calc(100% - 16px)", minHeight: "28px" }}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="w-4 h-4 opacity-80 dark:text-mac-secondary-label light:text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] leading-4 font-medium dark:text-mac-label light:text-black truncate">
            {getDisplayTitle(session)}
          </span>
          <span className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 shrink-0">
            {formatRelativeTime(session.last_active)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <MessageSquare className="w-3 h-3 dark:text-mac-tertiary-label light:text-gray-400" />
          <span className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400">
            {session.message_count} {session.message_count === 1 ? "message" : "messages"}
          </span>
          {session.model && (
            <>
              <span className="text-[10px] dark:text-mac-quaternary-label light:text-gray-300">·</span>
              <span className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 truncate">{session.model}</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        <button
          onClick={startEdit}
          title="Rename"
          className="mac-icon-btn !w-5 !h-5 dark:text-mac-secondary-label dark:hover:text-mac-blue light:text-gray-500 light:hover:text-blue-600"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={handleDeleteClick}
          title="Delete"
          className="mac-icon-btn !w-5 !h-5 dark:text-mac-secondary-label dark:hover:text-mac-red light:text-gray-500 light:hover:text-red-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
