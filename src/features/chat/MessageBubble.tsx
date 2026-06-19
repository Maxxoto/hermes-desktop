import { cn } from "../../lib/utils";
import { type Message } from "./use-chat-store";
import { ToolProgress } from "./ToolProgress";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700/50"
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolProgress toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
