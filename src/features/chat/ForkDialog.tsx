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
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-semibold text-gray-100">Fork Session</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            Create a branch of this session. You can continue from here while keeping the original.
          </p>
          {candidates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fork at message</label>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {candidates.map((msg) => {
                  const isSelected = selectedIndex === msg.absoluteIndex;
                  return (
                    <button key={msg.id} onClick={() => setSelectedIndex(msg.absoluteIndex)}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        isSelected ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
                      }`}>
                      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-blue-500" : "border-gray-600"}`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium uppercase ${msg.role === "user" ? "text-blue-400" : "text-emerald-400"}`}>{msg.role}</span>
                          <span className="text-[10px] text-gray-600">#{msg.absoluteIndex + 1}</span>
                        </div>
                        <p className="text-xs text-gray-300 truncate mt-0.5">{previewContent(msg.content)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {candidates.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <AlertCircle className="h-4 w-4" />
              <span>No messages to select as fork point.</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800/50">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800 bg-gray-900/80">
          <button onClick={onClose} disabled={forking}
            className="px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-gray-100 transition-colors disabled:opacity-50 cursor-pointer">Cancel</button>
          <button onClick={handleFork} disabled={forking || !sessionId || candidates.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
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
