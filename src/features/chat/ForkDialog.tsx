import { useState, useMemo } from "react";
import { GitFork, X, AlertCircle } from "lucide-react";
import { getGatewayClient } from "../connection/gateway-api";
import { useChatStore } from "./use-chat-store";

interface ForkDialogProps {
  open: boolean;
  onClose: () => void;
  onForked: (newSessionId: string) => void;
}

/** Truncate message content for display in the fork-point selector. */
function previewContent(content: string, maxLen = 80): string {
  if (!content) return "(empty)";
  const single = content.replace(/\s+/g, " ");
  return single.length > maxLen ? single.slice(0, maxLen) + "…" : single;
}

export default function ForkDialog({ open, onClose, onForked }: ForkDialogProps) {
  const { sessionId, messages } = useChatStore();
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(
    messages.length > 0 ? messages.length - 1 : undefined,
  );
  const [forking, setForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show the last N messages as fork-point candidates
  const MAX_VISIBLE = 10;
  const candidates = useMemo(() => {
    const start = Math.max(0, messages.length - MAX_VISIBLE);
    return messages.slice(start).map((m, i) => ({
      absoluteIndex: start + i,
      ...m,
    }));
  }, [messages]);

  // Reset selection when dialog opens
  if (open && selectedIndex === undefined && messages.length > 0) {
    setSelectedIndex(messages.length - 1);
  }

  const handleFork = async () => {
    if (!sessionId) {
      setError("No active session to fork.");
      return;
    }
    setForking(true);
    setError(null);

    try {
      const result = await getGatewayClient().forkSession(sessionId, selectedIndex);
      onForked(result.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fork session.",
      );
    } finally {
      setForking(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 rounded-lg dark:bg-mac-surface dark:border-white/[0.08] light:bg-white light:border-gray-200 border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b dark:border-mac-separator light:border-gray-200">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 dark:text-mac-blue light:text-blue-600" />
            <h2 className="text-[15px] font-semibold dark:text-mac-label light:text-black">Fork Session</h2>
          </div>
          <button onClick={onClose} className="mac-icon-btn !w-7 !h-7">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] dark:text-mac-secondary-label light:text-gray-600 leading-relaxed">
            Create a branch of this session. You can continue from here while keeping the original.
          </p>
          {candidates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium dark:text-mac-tertiary-label light:text-gray-500 uppercase tracking-wide">Fork at message</label>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {candidates.map((msg) => {
                  const isSelected = selectedIndex === msg.absoluteIndex;
                  return (
                    <button key={msg.id} onClick={() => setSelectedIndex(msg.absoluteIndex)}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-md border transition-colors ${
                        isSelected ? "border-blue-500 dark:bg-blue-500/10 light:bg-blue-500/5" : "dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/15 dark:hover:bg-white/5 light:border-gray-200 light:bg-gray-50 light:hover:border-gray-300 light:hover:bg-gray-100"
                      }`}>
                      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-blue-500" : "dark:border-white/20 light:border-gray-300"}`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-medium uppercase ${msg.role === "user" ? "dark:text-mac-blue light:text-blue-600" : "dark:text-mac-green light:text-green-600"}`}>{msg.role}</span>
                          <span className="text-[10px] dark:text-mac-quaternary-label light:text-gray-300">#{msg.absoluteIndex + 1}</span>
                        </div>
                        <p className="text-[11px] dark:text-mac-secondary-label light:text-gray-600 truncate mt-0.5">{previewContent(msg.content)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {candidates.length === 0 && (
            <div className="flex items-center gap-2 text-[13px] dark:text-mac-tertiary-label light:text-gray-400 py-2">
              <AlertCircle className="h-4 w-4" />
              <span>No messages to select as fork point.</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md dark:bg-mac-red/10 light:bg-red-500/10 border dark:border-mac-red/30 light:border-red-500/30">
              <AlertCircle className="h-4 w-4 dark:text-mac-red light:text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] dark:text-mac-red light:text-red-500">{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t dark:border-mac-separator dark:bg-white/[0.02] light:border-gray-200 light:bg-gray-50">
          <button onClick={onClose} disabled={forking}
            className="mac-btn disabled:opacity-50">Cancel</button>
          <button onClick={handleFork} disabled={forking || !sessionId || candidates.length === 0}
            className="mac-btn mac-btn-primary flex items-center gap-1.5 disabled:opacity-50">
            {forking ? (
              <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>Forking…</>
            ) : (
              <><GitFork className="h-4 w-4" /> Fork</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
