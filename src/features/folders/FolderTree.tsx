import { useState, useRef, useEffect } from "react";
import { FolderPlus } from "lucide-react";
import { useFolderStore } from "./use-folders";
import FolderItem from "./FolderItem";

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

const MAX_NESTING = 3;

function FolderSubtree({
  parentId,
  depth,
  selectedFolderId,
  onSelectFolder,
  expandedFolders,
  onToggle,
}: {
  parentId: string | null;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  expandedFolders: Set<string>;
  onToggle: (id: string) => void;
}) {
  const getFolderChildren = useFolderStore((s) => s.getFolderChildren);
  const children = getFolderChildren(parentId);

  if (children.length === 0) return null;

  return (
    <>
      {children.map((folder) => (
        <div key={folder.id}>
          <FolderItem
            folderId={folder.id}
            name={folder.name}
            depth={depth}
            isExpanded={expandedFolders.has(folder.id)}
            onToggle={() => onToggle(folder.id)}
            isSelected={selectedFolderId === folder.id}
            onSelect={() => onSelectFolder(folder.id)}
          />
          {expandedFolders.has(folder.id) && depth < MAX_NESTING && (
            <FolderSubtree
              parentId={folder.id}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
            />
          )}
        </div>
      ))}
    </>
  );
}

export default function FolderTree({
  selectedFolderId,
  onSelectFolder,
}: FolderTreeProps) {
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreating]);

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }
    createFolder(trimmed);
    setNewFolderName("");
    setIsCreating(false);
  };

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsCreating(false);
      setNewFolderName("");
    }
  };

  if (folders.length === 0 && !isCreating) {
    return (
      <div className="px-4 pb-1">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 text-[11px] dark:text-mac-tertiary-label light:text-gray-400 hover:text-mac-accent transition-colors"
        >
          <FolderPlus className="w-3 h-3" />
          Create a folder
        </button>
      </div>
    );
  }

  return (
    <div className="pb-1">
      {/* "All Sessions" root item */}
      <div
        onClick={() => onSelectFolder(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectFolder(null);
          }
        }}
        className={`flex items-center gap-1.5 px-2 py-1 cursor-default transition-colors
          ${selectedFolderId === null ? "dark:bg-white/10 light:bg-black/10" : "dark:hover:bg-white/5 light:hover:bg-black/5"}`}
        style={{ paddingLeft: "8px" }}
      >
        <span className="w-4" />
        <span className="text-[12px] font-medium dark:text-mac-label light:text-black">
          All Sessions
        </span>
      </div>

      {/* Folder tree */}
      <FolderSubtree
        parentId={null}
        depth={0}
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        expandedFolders={expandedFolders}
        onToggle={toggleExpand}
      />

      {/* Create folder */}
      {isCreating ? (
        <div className="flex items-center gap-1.5 px-2 py-1" style={{ paddingLeft: "20px" }}>
          <input
            ref={newFolderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleNewFolderKeyDown}
            onBlur={handleCreateFolder}
            placeholder="Folder name..."
            className="flex-1 min-w-0 h-[18px] px-1 rounded-[3px]
              dark:bg-mac-control dark:border-[rgba(255,255,255,0.1)] dark:text-mac-label
              light:bg-white light:border-gray-300 light:text-black
              border text-[11px] focus:outline-none focus:border-[var(--mac-accent)]"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] dark:text-mac-tertiary-label light:text-gray-400 hover:text-mac-accent transition-colors"
          style={{ paddingLeft: "20px" }}
        >
          <FolderPlus className="w-3 h-3" />
          New Folder
        </button>
      )}
    </div>
  );
}
