import { useTagStore } from "./use-tags";

interface TagFilterProps {
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

export default function TagFilter({ selectedTagId, onSelectTag }: TagFilterProps) {
  const tags = useTagStore((s) => s.tags);

  if (tags.length === 0) return null;

  return (
    <div className="shrink-0 px-4 pb-1.5">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {selectedTagId !== null && (
          <button
            onClick={() => onSelectTag(null)}
            className="shrink-0 inline-flex items-center h-[20px] px-2 rounded-full text-[10px] font-medium
              dark:bg-white/10 light:bg-black/10
              dark:text-mac-secondary-label light:text-gray-600
              hover:dark:bg-white/15 hover:light:bg-black/15 transition-colors"
          >
            All
          </button>
        )}
        {tags.map((tag) => {
          const isActive = selectedTagId === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => onSelectTag(isActive ? null : tag.id)}
              className="shrink-0 inline-flex items-center h-[20px] px-2 rounded-full text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: isActive ? `${tag.color}40` : `${tag.color}20`,
                color: tag.color,
                border: isActive ? `1px solid ${tag.color}60` : "1px solid transparent",
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
