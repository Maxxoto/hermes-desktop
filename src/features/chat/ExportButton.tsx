import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import type { Message } from "./use-chat-store";

interface ExportButtonProps {
  messages: Message[];
  sessionTitle: string;
  disabled?: boolean;
}

/**
 * Build a markdown string from chat messages.
 * Format: # {title}\n\n**User:** message\n\n**Assistant:** message\n\n
 */
export function buildMarkdown(title: string, messages: Message[]): string {
  const lines: string[] = [`# ${title}`, ""];

  for (const msg of messages) {
    const role = msg.role === "user" ? "User" : "Assistant";
    lines.push(`**${role}:** ${msg.content}`, "");
  }

  return lines.join("\n");
}

/**
 * Export chat messages as a markdown file.
 *
 * In Tauri mode, tries to use the native save dialog (if plugin-dialog is available).
 * Falls back to browser blob download in all other cases.
 */
export function ExportButton({ messages, sessionTitle, disabled }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (messages.length === 0) return;

    setExporting(true);
    const safeFilename = sessionTitle
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .trim()
      .slice(0, 60) || "chat";
    const markdown = buildMarkdown(sessionTitle, messages);

    try {
      // Try Tauri dialog plugin (dynamic import — may not be installed)
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        try {
          // @ts-ignore — plugin-dialog may not be installed in this project
          const { save } = await import("@tauri-apps/plugin-dialog");
          // @ts-ignore — plugin-fs may not be installed in this project
          const { writeFile } = await import("@tauri-apps/plugin-fs");
          const filePath = await save({
            defaultPath: `${safeFilename}.md`,
            filters: [{ name: "Markdown", extensions: ["md"] }],
          });
          if (filePath) {
            await writeFile(filePath, new TextEncoder().encode(markdown));
          }
          return;
        } catch {
          // Dialog/fs plugins not available — fall through to blob download
        }
      }

      // Browser fallback: blob download
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFilename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [messages, sessionTitle]);

  return (
    <button
      onClick={handleExport}
      title="Export as Markdown"
      disabled={disabled || messages.length === 0 || exporting}
      className="mac-icon-btn disabled:opacity-30"
    >
      <Download className="h-4 w-4" />
    </button>
  );
}
