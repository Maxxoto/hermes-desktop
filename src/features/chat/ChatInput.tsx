import { type KeyboardEvent, useRef } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "../../lib/utils";
import type { AttachedFile } from "../files/use-file-upload";
import AttachmentChip from "../files/AttachmentChip";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  files?: AttachedFile[];
  onFiles?: (files: FileList) => void;
  onRemoveFile?: (id: string) => void;
}

export function ChatInput({
  onSend,
  disabled,
  files,
  onFiles,
  onRemoveFile,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div
      className="glass-border-t px-5 py-4"
      style={{ background: "var(--mac-toolbar)" }}
    >
      {/* Attachment chips */}
      {files && files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {files.map((f) => (
            <AttachmentChip key={f.id} file={f} onRemove={onRemoveFile!} />
          ))}
        </div>
      )}
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* File picker button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach files"
          aria-label="Attach files"
          className="flex-shrink-0 mac-icon-btn !w-8 !h-8 dark:text-mac-tertiary-label light:text-gray-400"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv,.py,.js,.ts,.tsx,.go,.rs,.yaml,.yml,.toml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles?.(e.target.files);
            e.target.value = "";
          }}
        />
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
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          title="Send"
          aria-label="Send message"
          className={cn(
            "flex-shrink-0 flex items-center justify-center",
            "w-9 h-9 rounded-full",
            "send-btn-glass",
            "text-white",
            "transition-all duration-150",
            "active:scale-[0.92]",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
