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
    <div className="border-t dark:border-mac-separator light:border-gray-200 dark:bg-mac-content light:bg-white px-5 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message…"
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border px-3.5 py-2.5",
            "text-[13px] leading-4 min-h-[44px]",
            "dark:bg-white/5 dark:border-white/10 dark:text-mac-label dark:placeholder:text-mac-tertiary-label",
            "light:bg-black/5 light:border-black/10 light:text-black light:placeholder:text-gray-400",
            "focus:outline-none focus:border-[var(--mac-accent)] focus:shadow-[0_0_0_3px_rgba(10,132,255,0.25)]",
            "transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          title="Send"
          className={cn(
            "flex-shrink-0 flex items-center justify-center",
            "w-8 h-8 rounded-full transition-all",
            "bg-[var(--mac-accent)] text-white",
            "hover:opacity-90 active:opacity-80",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
