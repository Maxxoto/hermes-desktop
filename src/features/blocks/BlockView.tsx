import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { type Message } from "../chat/use-chat-store";
import { type ToolCall } from "../chat/use-chat-store";
import { BlockToolbar } from "./BlockToolbar";
import { CodeBlock } from "./CodeBlock";
import { ToolCallBlock } from "./ToolCallBlock";

export interface BlockViewProps {
  message: Message;
  index: number;
  onRetry?: () => void;
  onBookmark?: (content: string) => void;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return "";
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BlockView({
  message,
  index,
  onRetry,
  onBookmark,
}: BlockViewProps) {
  const isUser = message.role === "user";
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const avatar = isUser ? "👤" : "🤖";
  const roleName = isUser ? "You" : "Hermes";
  const timestamp = formatTimestamp(message.timestamp);

  return (
    <div
      className={cn(
        "group flex w-full mb-3",
        isUser ? "justify-end" : "justify-start",
      )}
      data-testid={`block-${isUser ? "user" : "assistant"}-${index}`}
    >
      <div
        className={cn(
          "relative max-w-[80%] rounded-xl overflow-hidden",
          "transition-all duration-200",
          // Border
          "border dark:border-white/[0.08] light:border-black/[0.08]",
          // Background
          isUser
            ? "dark:bg-mac-accent/10 light:bg-blue-500/10"
            : "dark:bg-white/[0.04] light:bg-white/80",
        )}
      >
        {/* Header — clickable to collapse (div to avoid nested buttons) */}
        <div
          role="button"
          tabIndex={0}
          onClick={toggleCollapsed}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleCollapsed();
            }
          }}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2",
            "text-left cursor-default",
            "hover:dark:bg-white/[0.03] hover:light:bg-black/[0.02]",
            "transition-colors duration-150",
          )}
          data-testid="block-header"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 dark:text-mac-tertiary-label light:text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 dark:text-mac-tertiary-label light:text-gray-400 flex-shrink-0" />
          )}
          <span className="text-[14px]">{avatar}</span>
          <span className="text-[12px] font-semibold dark:text-mac-secondary-label light:text-gray-600">
            {roleName}
          </span>
          {timestamp && (
            <span className="text-[10px] dark:text-mac-quaternary-label light:text-gray-400">
              {timestamp}
            </span>
          )}
          {collapsed && (
            <span className="text-[11px] dark:text-mac-quaternary-label light:text-gray-400 ml-1">
              …
            </span>
          )}

          {/* Toolbar floats to the right in header */}
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <BlockToolbar
              content={message.content}
              role={message.role}
              onRetry={onRetry}
              onBookmark={onBookmark}
            />
          </div>
        </div>

        {/* Content — hidden when collapsed */}
        {!collapsed && (
          <div
            className={cn(
              "px-3 pb-2.5",
              "text-[13px] leading-[1.4]",
              "dark:text-mac-label light:text-black",
              "break-words",
              isUser ? "whitespace-pre-wrap" : "",
            )}
          >
            {isUser ? (
              <p className="m-0">{message.content}</p>
            ) : (
              <div className="markdown-prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const { children, className: codeClassName, ...rest } =
                        props;
                      // Detect block code (has className with "language-")
                      const isBlock =
                        codeClassName && /language-/.test(codeClassName);
                      if (isBlock) {
                        return (
                          <CodeBlock className={codeClassName}>
                            {String(children).replace(/\n$/, "")}
                          </CodeBlock>
                        );
                      }
                      // Inline code — fall back to default
                      return (
                        <code className={codeClassName} {...rest}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Tool calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-2">
                {message.toolCalls.map((tc: ToolCall, i: number) => (
                  <ToolCallBlock key={`${tc.tool}-${i}`} toolCall={tc} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
