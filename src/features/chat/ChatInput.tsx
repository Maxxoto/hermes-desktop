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
    <div className="glass-border-t px-5 py-4"
      style={{ background: "var(--mac-toolbar)" }}>
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message…"
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl px-4 py-3",
            "text-[13px] leading-5 min-h-[44px]",
            "glass-input",
            "dark:text-mac-label dark:placeholder:text-mac-tertiary-label",
            "light:text-black light:placeholder:text-gray-400",
            "focus:outline-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          title="Send"
          className={cn(
            "flex-shrink-0 flex items-center justify-center",
            "w-9 h-9 rounded-full",
            "send-btn-glass",
            "text-white",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
