/**
 * extractObjects.ts — Heuristic extraction of structured objects from chat messages.
 *
 * Patterns:
 *   Decision: "decided", "chose", "going with", "selected", "agreed", "conclusion"
 *   Action:   "need to", "should", "TODO", "must", "will do", "action item", "follow up", "- [ ]"
 *   Snippet:  code blocks between ``` ```
 *   Contact:  names with roles — "John from engineering", "Sarah the PM"
 *   Bookmark: URLs / links
 */
import type { TypedObject } from "./use-objects";

// ---------------------------------------------------------------------------
// Decision patterns
// ---------------------------------------------------------------------------
const DECISION_PATTERNS =
  /\b(?:decided|chose|going with|selected|agreed|final answer|conclusion|we'll use|let's go with|the choice is)\b[:\s-]+(.+)/gi;

// ---------------------------------------------------------------------------
// Action patterns
// ---------------------------------------------------------------------------
const ACTION_PATTERNS =
  /\b(?:need to|should|TODO|must|will do|action item|follow up|make sure to|remember to|don't forget)\b[:\s-]+(.+)/gi;
const CHECKBOX_PATTERN = /- \[ \]\s+(.+)/g;

// ---------------------------------------------------------------------------
// Snippet patterns (code blocks)
// ---------------------------------------------------------------------------
const SNIPPET_PATTERN = /```(\w+)?\n([\s\S]+?)```/g;

// ---------------------------------------------------------------------------
// Contact patterns
// ---------------------------------------------------------------------------
const CONTACT_PATTERNS =
  /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:from|the|at|in|on)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s|,|\.|!|\?|$)/g;

// ---------------------------------------------------------------------------
// URL patterns
// ---------------------------------------------------------------------------
const URL_PATTERN = /https?:\/\/[^\s"'`<>)}\]]+/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cleanMatch(match: string): string {
  return match.trim().replace(/[.!?,;:]+$/, "").trim();
}

function extractTagsFromContent(content: string): string[] {
  const tags: string[] = [];
  // Extract inline tags (#tag)
  const tagMatches = content.matchAll(/(?:^|\s)#([a-zA-Z0-9_-]+)/g);
  for (const m of tagMatches) {
    tags.push(m[1].toLowerCase());
  }
  return [...new Set(tags)];
}

function deriveTitle(content: string, type: TypedObject["type"]): string {
  // Take first ~60 chars as title, trimmed at word boundary
  const maxLen = 60;
  if (content.length <= maxLen) return content;
  const truncated = content.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------
export function extractFromMessage(
  content: string,
  sessionId: string
): TypedObject[] {
  const objects: TypedObject[] = [];
  const seen = new Set<string>(); // deduplicate by content

  function addUnique(
    type: TypedObject["type"],
    extractedContent: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ) {
    const trimmed = cleanMatch(extractedContent);
    if (!trimmed || trimmed.length < 5) return;
    // Deduplicate by normalized content
    const key = `${type}:${trimmed.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    const contentTags = extractTagsFromContent(trimmed);
    objects.push({
      id: "", // filled by store
      type,
      title: deriveTitle(trimmed, type),
      content: trimmed,
      metadata,
      sessionId,
      timestamp: Date.now(),
      tags: [...new Set([...tags, ...contentTags])],
    });
  }

  // --- Decisions ---
  let m: RegExpExecArray | null;
  const decRe = new RegExp(DECISION_PATTERNS.source, "gi");
  while ((m = decRe.exec(content)) !== null) {
    addUnique("decision", m[1], { keyword: m[0].split(/[:\s-]+/)[0] });
  }

  // --- Actions ---
  const actRe = new RegExp(ACTION_PATTERNS.source, "gi");
  while ((m = actRe.exec(content)) !== null) {
    addUnique("action", m[1], { keyword: m[0].split(/[:\s-]+/)[0] });
  }

  // Checkbox-style actions
  const cbRe = new RegExp(CHECKBOX_PATTERN.source, "g");
  while ((m = cbRe.exec(content)) !== null) {
    addUnique("action", m[1], { source: "checkbox" });
  }

  // --- Snippets ---
  const snRe = new RegExp(SNIPPET_PATTERN.source, "g");
  while ((m = snRe.exec(content)) !== null) {
    const lang = m[1] || "unknown";
    const code = m[2].trim();
    if (code.length > 10) {
      // skip trivial one-liners
      addUnique(
        "snippet",
        code,
        { language: lang },
        [lang !== "unknown" ? lang : ""].filter(Boolean)
      );
    }
  }

  // --- Contacts ---
  const conRe = new RegExp(CONTACT_PATTERNS.source, "g");
  while ((m = conRe.exec(content)) !== null) {
    const name = m[1].trim();
    const role = m[2].trim();
    // Guard: role shouldn't be too long (likely not a real role)
    if (role.split(/\s+/).length <= 4 && name.split(/\s+/).length <= 3) {
      addUnique(
        "contact",
        `${name} — ${role}`,
        { name, role },
        [role.replace(/\s+/g, "-").toLowerCase()]
      );
    }
  }

  // --- Bookmarks ---
  const urlRe = new RegExp(URL_PATTERN.source, "g");
  while ((m = urlRe.exec(content)) !== null) {
    const url = m[0];
    // Try to extract a domain label
    let domain = "";
    try {
      domain = new URL(url).hostname.replace("www.", "");
    } catch {
      domain = "link";
    }
    addUnique("bookmark", url, { url, domain }, [domain]);
  }

  return objects;
}

/**
 * Batch extraction: process multiple messages and return all objects.
 */
export function extractFromMessages(
  messages: Array<{ content: string; sessionId: string }>
): TypedObject[] {
  const all: TypedObject[] = [];
  for (const msg of messages) {
    all.push(...extractFromMessage(msg.content, msg.sessionId));
  }
  return all;
}
