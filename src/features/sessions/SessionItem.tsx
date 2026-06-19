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
        className={`w-full px-3 py-2.5 flex items-center gap-2 transition-colors
          ${isActive ? "bg-blue-900/50 border-l-2 border-blue-500" : "border-l-2 border-transparent"}`}
      >
        <div className="shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={editInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={commitRename}
          className="flex-1 min-w-0 px-2 py-0.5 rounded bg-gray-800 border border-gray-600
            text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={commitRename}
          title="Save"
          className="shrink-0 p-1 rounded text-green-400 hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={cancelRename}
          title="Cancel"
          className="shrink-0 p-1 rounded text-gray-400 hover:bg-gray-700 transition-colors cursor-pointer"
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
        className={`w-full px-3 py-2.5 flex items-center gap-2 transition-colors
          ${isActive ? "bg-blue-900/50 border-l-2 border-blue-500" : "border-l-2 border-transparent"}`}
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs text-red-400 truncate block">
            Delete this conversation?
          </span>
        </div>
        <button
          onClick={handleConfirmDelete}
          title="Confirm delete"
          className="shrink-0 px-2 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-500
            text-white transition-colors cursor-pointer"
        >
          Delete
        </button>
        <button
          onClick={handleCancelDelete}
          title="Cancel"
          className="shrink-0 p-1 rounded text-gray-400 hover:bg-gray-700 transition-colors cursor-pointer"
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
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors cursor-pointer
        ${isActive
          ? "bg-blue-900/50 border-l-2 border-blue-500"
          : "hover:bg-gray-800/50 border-l-2 border-transparent"
        }`}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-100 truncate">
            {getDisplayTitle(session)}
          </span>
          <span className="text-xs text-gray-500 shrink-0">
            {formatRelativeTime(session.last_active)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <MessageSquare className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {session.message_count} {session.message_count === 1 ? "message" : "messages"}
          </span>
          {session.model && (
            <>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500 truncate">{session.model}</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        <button
          onClick={startEdit}
          title="Rename"
          className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={handleDeleteClick}
          title="Delete"
          className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
