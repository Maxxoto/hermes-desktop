import { type KeyboardEvent, useRef } from "react";
import { Send } from "lucide-react";
import { cn } from "../../lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    onSend(text);
    el.value = "";
    el.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-gray-700/60 bg-gray-900/80 backdrop-blur-sm px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message…"
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5",
            "text-sm text-gray-100 placeholder-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
            "transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          className={cn(
            "flex-shrink-0 rounded-xl p-2.5 transition-all",
            "bg-blue-600 hover:bg-blue-500 text-white",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          )}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
