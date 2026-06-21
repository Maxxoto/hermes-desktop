import { useState, useCallback, useEffect, useRef } from "react";
import type { ContentType } from "./ActionButtons";

// ============================================================================
// Types
// ============================================================================

export interface QuickAccessItem {
  id: string;
  content: string;
  contentType: ContentType;
  preview: string;
  timestamp: number;
}

interface UseQuickAccessOptions {
  autoDismissMs?: number;
  maxPreviewLength?: number;
}

interface UseQuickAccessReturn {
  /** Current quick-access item (null when dismissed) */
  item: QuickAccessItem | null;
  /** Whether the card is visible */
  visible: boolean;
  /** Show the card with explicit content + type */
  show: (content: string, contentType: ContentType) => void;
  /** Manually dismiss the card */
  dismiss: () => void;
  /** Evaluate assistant message text and show card if triggered */
  evaluateResponse: (text: string) => void;
}

// ============================================================================
// Content Detection
// ============================================================================

const CODE_BLOCK_RE = /```[\s\S]*?```/;
const SCREENSHOT_RE = /\[Screenshot\]/i;
const FILE_OP_RE = /\b(wrote|saved|created|written|deleted|moved|renamed)\s+(?:file|to)\s+/i;
const ERROR_RE = /\b(Error|Exception|Traceback|FAILED|error:)\b/i;

/**
 * Detect content type from assistant response text.
 * Returns null if nothing trigger-worthy.
 */
export function detectContentType(
  text: string,
): ContentType | null {
  if (CODE_BLOCK_RE.test(text)) return "code";
  if (SCREENSHOT_RE.test(text)) return "screenshot";
  if (FILE_OP_RE.test(text)) return "text";
  if (ERROR_RE.test(text)) return "error";
  return null;
}

/**
 * Extract the first code block content (without fences).
 */
export function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

/**
 * Build a short preview string from content.
 */
export function buildPreview(
  content: string,
  contentType: ContentType,
  maxLen: number,
): string {
  switch (contentType) {
    case "code": {
      const code = extractCodeBlock(content) ?? content;
      const firstLine = code.split("\n")[0];
      return `Code: ${firstLine.slice(0, maxLen)}`;
    }
    case "screenshot":
      return "Screenshot analysis detected";
    case "error": {
      const firstLine = content.split("\n")[0];
      return firstLine.slice(0, maxLen);
    }
    case "text":
    default: {
      const stripped = content.replace(/\n/g, " ").trim();
      return stripped.slice(0, maxLen);
    }
  }
}

// ============================================================================
// Hook
// ============================================================================

let _nextId = 0;

export function useQuickAccess(
  options: UseQuickAccessOptions = {},
): UseQuickAccessReturn {
  const { autoDismissMs = 10_000, maxPreviewLength = 80 } = options;

  const [item, setItem] = useState<QuickAccessItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setItem(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (content: string, contentType: ContentType) => {
      dismiss(); // clear any existing
      const newItem: QuickAccessItem = {
        id: `qa_${Date.now()}_${_nextId++}`,
        content,
        contentType,
        preview: buildPreview(content, contentType, maxPreviewLength),
        timestamp: Date.now(),
      };
      setItem(newItem);

      // auto-dismiss
      if (autoDismissMs > 0) {
        timerRef.current = setTimeout(() => {
          setItem(null);
          timerRef.current = null;
        }, autoDismissMs);
      }
    },
    [autoDismissMs, maxPreviewLength, dismiss],
  );

  const evaluateResponse = useCallback(
    (text: string) => {
      const type = detectContentType(text);
      if (type) {
        show(text, type);
      }
    },
    [show],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    item,
    visible: item !== null,
    show,
    dismiss,
    evaluateResponse,
  };
}
