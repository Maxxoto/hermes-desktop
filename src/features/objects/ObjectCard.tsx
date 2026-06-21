/**
 * ObjectCard.tsx — Individual typed-object card with glass styling.
 *
 * Shows: type icon + color, title, content preview, tags, session link,
 *        timestamp, delete button.
 */
import { useMemo } from "react";
import {
  Lightbulb,
  CheckSquare,
  Code2,
  Link,
  User,
  Trash2,
  MessageSquare,
} from "lucide-react";
import type { TypedObject } from "./use-objects";

const TYPE_CONFIG: Record<
  TypedObject["type"],
  { icon: React.ElementType; color: string; bgClass: string; textClass: string; borderClass: string }
> = {
  decision: {
    icon: Lightbulb,
    color: "orange",
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/20",
  },
  action: {
    icon: CheckSquare,
    color: "blue",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/20",
  },
  snippet: {
    icon: Code2,
    color: "green",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
    borderClass: "border-green-500/20",
  },
  bookmark: {
    icon: Link,
    color: "red",
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/20",
  },
  contact: {
    icon: User,
    color: "purple",
    bgClass: "bg-purple-500/10",
    textClass: "text-purple-400",
    borderClass: "border-purple-500/20",
  },
};

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface ObjectCardProps {
  obj: TypedObject;
  onSelect: (obj: TypedObject) => void;
  onDelete: (id: string) => void;
}

export function ObjectCard({ obj, onSelect, onDelete }: ObjectCardProps) {
  const config = TYPE_CONFIG[obj.type];
  const Icon = config.icon;

  const contentPreview = useMemo(() => {
    const lines = obj.content.split("\n").slice(0, 2).join(" ");
    return lines.length > 100 ? lines.slice(0, 97) + "…" : lines;
  }, [obj.content]);

  return (
    <div
      className={`
        group relative rounded-xl p-3 cursor-pointer
        transition-all duration-200
        hover:scale-[1.01] hover:shadow-lg
        ${config.borderClass} border
      `}
      style={{
        background: "var(--glass-gradient-dark)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        boxShadow: `
          0 4px 24px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.04)
        `,
      }}
      onClick={() => onSelect(obj)}
      data-testid={`object-card-${obj.id}`}
    >
      {/* Reflection overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ background: "var(--glass-reflection)", opacity: 0.15 }}
      />

      <div className="relative flex items-start gap-3">
        {/* Type icon */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${config.bgClass}
          `}
        >
          <Icon className={`w-4 h-4 ${config.textClass}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-mac-label truncate leading-tight">
            {obj.title}
          </h3>
          <p className="text-[12px] text-mac-tertiary-label mt-0.5 line-clamp-2 leading-snug">
            {contentPreview}
          </p>

          {/* Tags */}
          {obj.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {obj.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={`
                    text-[10px] px-1.5 py-0.5 rounded-full font-medium
                    ${config.bgClass} ${config.textClass}
                  `}
                >
                  {tag}
                </span>
              ))}
              {obj.tags.length > 3 && (
                <span className="text-[10px] text-mac-tertiary-label">
                  +{obj.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-mac-tertiary-label flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {obj.sessionId.slice(0, 8)}
            </span>
            <span className="text-[10px] text-mac-tertiary-label">
              {formatTimestamp(obj.timestamp)}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <button
          className={`
            flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity
            text-mac-tertiary-label hover:text-mac-red
            hover:bg-red-500/10
          `}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(obj.id);
          }}
          title="Delete object"
          data-testid={`object-delete-${obj.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
