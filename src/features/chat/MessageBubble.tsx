import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { type Message } from "./use-chat-store";
import { ToolProgress } from "./ToolProgress";
import "../chat/markdown-styles.css";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might not be available in all contexts
    }
  }, [message.content]);

  return (
    <div
      className={cn(
        "group flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? (
        // User message — right-aligned, subtle background, 12px radius
        <div className="message-content max-w-[80%] rounded-xl px-3.5 py-2.5 break-words
          dark:bg-white/5 light:bg-black/5 whitespace-pre-wrap
          text-[13px] leading-4 dark:text-mac-label light:text-black">
          <p>{message.content}</p>
        </div>
      ) : (
        // Assistant message — left-aligned, NO background
        <div className="message-content max-w-[80%] py-2.5 px-0 break-words
          text-[13px] leading-4 dark:text-mac-label light:text-black">
          <div className="markdown-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <ToolProgress toolCalls={message.toolCalls} />
          )}
        </div>
      )}

      {/* Copy button — appears on hover */}
      <div
        className={cn(
          "flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          isUser ? "order-first mr-1" : "ml-1"
        )}
      >
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy message"}
          aria-label={copied ? "Copied!" : "Copy message"}
          className={cn(
            "mac-icon-btn !w-7 !h-7 transition-all duration-150 active:scale-[0.92]",
            copied
              ? "dark:text-mac-green light:text-green-600"
              : "dark:text-mac-tertiary-label light:text-gray-400"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
