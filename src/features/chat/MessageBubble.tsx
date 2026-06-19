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
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 break-words",
          isUser
            ? "bg-blue-600 text-white rounded-br-md whitespace-pre-wrap"
            : "bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700/50"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="markdown-prose text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolProgress toolCalls={message.toolCalls} />
        )}
      </div>

      {/* Copy button — appears on hover */}
      <div
        className={cn(
          "flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity",
          isUser ? "order-first mr-1" : "ml-1"
        )}
      >
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy message"}
          className={cn(
            "p-1.5 rounded-lg transition-colors cursor-pointer",
            copied
              ? "text-green-400 hover:text-green-300"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {copied && (
          <span className="ml-0.5 text-xs text-green-400 font-medium">Copied!</span>
        )}
      </div>
    </div>
  );
}
