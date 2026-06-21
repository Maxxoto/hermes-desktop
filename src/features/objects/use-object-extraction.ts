/**
 * use-object-extraction.ts — Hook that watches chat messages and auto-extracts
 * typed objects in real-time.
 */
import { useEffect, useRef } from "react";
import { useChatStore } from "../chat/use-chat-store";
import { useObjectStore } from "./use-objects";
import { extractFromMessage } from "./extractObjects";

/**
 * Watches the current chat session's messages. When new assistant messages arrive,
 * extracts typed objects and adds them to the object store.
 *
 * Deduplicates by content hash to avoid re-extracting the same objects.
 */
export function useObjectExtraction() {
  const messages = useChatStore((s) => s.messages);
  const sessionId = useChatStore((s) => s.sessionId);
  const addObject = useObjectStore((s) => s.addObject);
  const existingObjects = useObjectStore((s) => s.objects);

  // Track which message IDs we've already processed
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId || messages.length === 0) return;

    for (const msg of messages) {
      // Skip already-processed messages
      if (processedRef.current.has(msg.id)) continue;
      processedRef.current.add(msg.id);

      // Only extract from substantial content
      if (!msg.content || msg.content.length < 20) continue;

      // Check if objects for this message already exist in store
      const msgAlreadyExtracted = existingObjects.some(
        (o) => o.sessionId === sessionId && o.metadata._sourceMsgId === msg.id
      );
      if (msgAlreadyExtracted) continue;

      // Extract objects
      const extracted = extractFromMessage(msg.content, sessionId);
      for (const obj of extracted) {
        addObject({
          ...obj,
          metadata: { ...obj.metadata, _sourceMsgId: msg.id },
        });
      }
    }
  }, [messages, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset processed set when session changes
  useEffect(() => {
    processedRef.current = new Set();
  }, [sessionId]);
}
