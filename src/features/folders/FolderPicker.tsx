import { useEffect, useRef } from "react";
import { Folder } from "lucide-react";
import { useFolderStore } from "./use-folders";

interface FolderPickerProps {
  sessionId: string;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export default function FolderPicker({ sessionId, onSelect, onClose }: FolderPickerProps) {
  const folders = useFolderStore((s) => s.folders);
  const sessionFolders = useFolderStore((s) => s.sessionFolders);
  const currentFolderId = sessionFolders[sessionId] || null;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="glass-surface rounded-lg py-1 min-w-[160px] animate-cmdk-scale"
    >
      {/* "No folder" option */}
      <button
        onClick={() => onSelect(null)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-white/10 transition-colors"
      >
        <span className="w-3 h-3" />
        <span className={`flex-1 text-left ${currentFolderId === null ? "dark:text-mac-accent light:text-blue-500" : "dark:text-mac-label light:text-black"}`}>
          No Folder
        </span>
        {currentFolderId === null && <span className="text-[10px] dark:text-mac-tertiary-label">✓</span>}
      </button>

      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-white/10 transition-colors"
        >
          <Folder className="w-3 h-3 dark:text-mac-accent light:text-blue-500" />
          <span className={`flex-1 text-left truncate ${currentFolderId === folder.id ? "dark:text-mac-accent light:text-blue-500" : "dark:text-mac-label light:text-black"}`}>
            {folder.name}
          </span>
          {currentFolderId === folder.id && <span className="text-[10px] dark:text-mac-tertiary-label">✓</span>}
        </button>
      ))}
    </div>
  );
}
