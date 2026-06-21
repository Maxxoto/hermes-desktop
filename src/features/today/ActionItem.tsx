/**
 * ActionItem.tsx — Checkbox component with strikethrough when completed.
 *
 * Like Things 3: tap to toggle, satisfying animation.
 */
import { useCallback } from "react";
import { Check } from "lucide-react";
import type { ActionItem as ActionItemType } from "./use-today";

interface ActionItemProps {
  item: ActionItemType;
  onToggle: (id: string) => void;
}

export function ActionItem({ item, onToggle }: ActionItemProps) {
  const handleClick = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <button
      onClick={handleClick}
      className="group flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-white/[0.04]"
      data-testid="action-item"
      aria-label={item.completed ? `Completed: ${item.text}` : item.text}
    >
      {/* Checkbox */}
      <div
        className={`flex-shrink-0 w-[18px] h-[18px] mt-[1px] rounded-md border transition-all duration-200 flex items-center justify-center ${
          item.completed
            ? "border-mac-green bg-mac-green/20"
            : "border-white/20 group-hover:border-white/35"
        }`}
      >
        {item.completed && (
          <Check className="w-3 h-3 text-mac-green" strokeWidth={3} />
        )}
      </div>

      {/* Text */}
      <span
        className={`flex-1 text-[13px] leading-[18px] transition-all duration-200 ${
          item.completed
            ? "line-through dark:text-mac-tertiary-label light:text-gray-400"
            : "dark:text-mac-label light:text-black"
        }`}
      >
        {item.text}
      </span>
    </button>
  );
}
