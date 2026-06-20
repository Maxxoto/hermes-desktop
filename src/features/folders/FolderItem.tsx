import { useState, useRef, useEffect } from "react";
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useFolderStore } from "./use-folders";

interface FolderItemProps {
  folderId: string;
  name: string;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export default function FolderItem({
  folderId,
  name,
  depth,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
}: FolderItemProps) {
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const getFolderChildren = useFolderStore((s) => s.getFolderChildren);
  const getSessionsInFolder = useFolderStore((s) => s.getSessionsInFolder);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const childFolders = getFolderChildren(folderId);
  const sessionCount = getSessionsInFolder(folderId).length;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(name);
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === name) {
      setIsEditing(false);
      return;
    }
    renameFolder(folderId, trimmed);
    setIsEditing(false);
  };

  const cancelRename = () => {
    setIsEditing(false);
    setEditName(name);
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFolder(folderId);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  if (showDeleteConfirm) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[11px] dark:text-mac-red light:text-red-500 truncate block">
            Delete folder?
          </span>
        </div>
        <button
          onClick={handleConfirmDelete}
          title="Confirm delete"
          className="mac-btn mac-btn-destructive !h-6 px-2 text-[10px]"
        >
          Delete
        </button>
        <button
          onClick={handleCancelDelete}
          title="Cancel"
          className="mac-icon-btn !w-5 !h-5 dark:text-mac-secondary-label light:text-gray-500"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex items-center gap-1.5 px-2 py-1 cursor-default transition-colors
        ${isSelected ? "dark:bg-white/10 light:bg-black/10" : "dark:hover:bg-white/5 light:hover:bg-black/5"}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="shrink-0 w-4 h-4 flex items-center justify-center dark:text-mac-tertiary-label light:text-gray-400"
        aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
      >
        {childFolders.length > 0 || true ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )
        ) : null}
      </button>

      <Folder className="w-3.5 h-3.5 shrink-0 dark:text-mac-accent light:text-blue-500" />

      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={commitRename}
          className="flex-1 min-w-0 h-[18px] px-1 rounded-[3px]
            dark:bg-mac-control dark:border-[rgba(255,255,255,0.1)] dark:text-mac-label
            light:bg-white light:border-gray-300 light:text-black
            border text-[11px] focus:outline-none focus:border-[var(--mac-accent)]"
        />
      ) : (
        <span className="flex-1 min-w-0 text-[12px] truncate dark:text-mac-label light:text-black">
          {name}
        </span>
      )}

      {!isEditing && (
        <span className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 shrink-0">
          {sessionCount > 0 ? sessionCount : ""}
        </span>
      )}

      {!isEditing && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={startRename}
            title="Rename folder"
            className="mac-icon-btn !w-5 !h-5 dark:text-mac-secondary-label dark:hover:text-mac-blue light:text-gray-500 light:hover:text-blue-600"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={handleDeleteClick}
            title="Delete folder"
            className="mac-icon-btn !w-5 !h-5 dark:text-mac-secondary-label dark:hover:text-mac-red light:text-gray-500 light:hover:text-red-500"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}
