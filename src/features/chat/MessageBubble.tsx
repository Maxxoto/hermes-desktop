import { useCallback } from "react";
import { type Message } from "./use-chat-store";
import { BlockView } from "../blocks/BlockView";
import { useBookmarkStore } from "../blocks/use-bookmarks";

interface MessageBubbleProps {
  message: Message;
  index?: number;
  onRetry?: () => void;
}

export function MessageBubble({ message, index = 0, onRetry }: MessageBubbleProps) {
  const { addBookmark } = useBookmarkStore();

  const handleBookmark = useCallback(
    (content: string) => {
      addBookmark(content, "current");
    },
    [addBookmark],
  );

  return (
    <BlockView
      message={message}
      index={index}
      onRetry={onRetry}
      onBookmark={handleBookmark}
    />
  );
}
