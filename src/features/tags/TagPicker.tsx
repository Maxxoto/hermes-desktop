import { useState, useRef, useEffect } from "react";
import { Tag, Plus, Check } from "lucide-react";
import { useTagStore, TAG_COLORS_LIST } from "./use-tags";

interface TagPickerProps {
  sessionId: string;
  onClose: () => void;
}

export default function TagPicker({ sessionId, onClose }: TagPickerProps) {
  const tags = useTagStore((s) => s.tags);
  const sessionTags = useTagStore((s) => s.sessionTags);
  const createTag = useTagStore((s) => s.createTag);
  const addTagToSession = useTagStore((s) => s.addTagToSession);
  const removeTagFromSession = useTagStore((s) => s.removeTagFromSession);

  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS_LIST[0]);
  const newTagInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTagIds = sessionTags[sessionId] || [];

  useEffect(() => {
    if (isCreating && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleCreateTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const tag = createTag(trimmed, newTagColor);
    addTagToSession(sessionId, tag.id);
    setNewTagName("");
    setIsCreating(false);
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsCreating(false);
    }
  };

  const toggleTag = (tagId: string) => {
    if (activeTagIds.includes(tagId)) {
      removeTagFromSession(sessionId, tagId);
    } else {
      addTagToSession(sessionId, tagId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="glass-surface rounded-lg py-1 min-w-[180px] animate-cmdk-scale z-50"
    >
      {tags.length > 0 && (
        <div className="px-2 py-1">
          {tags.map((tag) => {
            const isActive = activeTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="flex items-center gap-2 w-full px-2 py-1 rounded text-[12px] hover:bg-white/10 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left dark:text-mac-label light:text-black">
                  {tag.name}
                </span>
                {isActive && (
                  <Check className="w-3 h-3 dark:text-mac-accent light:text-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t dark:border-mac-separator light:border-gray-200 mx-2" />

      {isCreating ? (
        <div className="px-2 py-1.5">
          <input
            ref={newTagInputRef}
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            onBlur={handleCreateTag}
            placeholder="Tag name..."
            className="w-full h-[22px] px-2 rounded-[4px]
              dark:bg-mac-control dark:border-[rgba(255,255,255,0.1)] dark:text-mac-label
              light:bg-white light:border-gray-300 light:text-black
              border text-[11px] focus:outline-none focus:border-[var(--mac-accent)] mb-1.5"
          />
          <div className="flex gap-1 flex-wrap">
            {TAG_COLORS_LIST.map((color) => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className={`w-4 h-4 rounded-full transition-transform ${newTagColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : ""}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 w-full px-4 py-1.5 text-[12px] dark:text-mac-tertiary-label light:text-gray-400 hover:text-mac-accent hover:bg-white/5 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Create new tag
        </button>
      )}
    </div>
  );
}
