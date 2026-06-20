import { useCallback, useEffect, useRef, useState } from "react";
import { Send, X, Keyboard, Mic, Activity, Volume2, VolumeX, Settings, Monitor, MonitorOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { useOverlayMode, type OverlayMode } from "./use-overlay-window";
import { useVoiceRecorder } from "./use-voice-recorder";
import { useVAD, type VADStatus } from "./use-vad";
import { useTTS } from "./use-tts";
import { useScreenShare } from "./use-screen-share";
import { VoiceButton } from "./VoiceButton";
import { ScreenPreview } from "./ScreenPreview";
import { ScreenshotThumbnail } from "./ScreenshotThumbnail";
import { StatusIndicator, type IndicatorState } from "./StatusIndicator";
import {
  GatewayClient,
  type GatewayEvent,
} from "../connection/gateway-api";

/**
 * Compact chat UI for the overlay window.
 * Supports Type, PTT, and VAD modes.
 * Includes TTS playback via Resemble AI.
 */
export default function CompactChat({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) {
  const { mode, setMode } = useOverlayMode();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recorder for PTT mode
  const voiceRecorder = useVoiceRecorder();

  // VAD for VAD mode
  const vad = useVAD({
    onSpeechEnd: useCallback(
      (text: string) => {
        if (text.trim()) {
          setInputText(text.trim());
        }
      },
      [],
    ),
  });

  // TTS for assistant responses
  const tts = useTTS();

  // Screen share
  const screenShare = useScreenShare();
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Update input text from voice transcript
  useEffect(() => {
    if (mode === "ptt" && voiceRecorder.transcript) {
      setInputText(voiceRecorder.transcript);
    }
  }, [voiceRecorder.transcript, mode]);

  useEffect(() => {
    if (mode === "vad" && vad.transcript) {
      setInputText(vad.transcript);
    }
  }, [vad.transcript, mode]);

  // Clean up VAD on unmount or mode change
  useEffect(() => {
    return () => {
      if (mode === "vad") {
        vad.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Clean up TTS on unmount
  useEffect(() => {
    return () => {
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up screen share on unmount
  useEffect(() => {
    return () => {
      screenShare.stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle screenshot capture from screen share
  const handleScreenCapture = useCallback(() => {
    setIsCapturing(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const screenshot = screenShare.captureScreenshot();
      if (screenshot) {
        setPendingScreenshot(screenshot);
      }
      setIsCapturing(false);
    }, 150);
  }, [screenShare]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Derive status indicator state
  const getIndicatorState = (): IndicatorState => {
    if (isCapturing) return "capturing";
    if (screenShare.isSharing) return "screen-sharing";
    if (isStreaming) return "thinking";
    if (tts.status === "speaking") return "tts-speaking";
    if (mode === "ptt" && voiceRecorder.status === "loading-model")
      return "loading-model";
    if (mode === "ptt" && voiceRecorder.status === "recording")
      return "recording";
    if (mode === "ptt" && voiceRecorder.status === "transcribing")
      return "transcribing";
    if (mode === "vad") {
      const vadStatusMap: Record<VADStatus, IndicatorState> = {
        idle: "idle",
        listening: "listening",
        speaking: "speaking",
        processing: "processing",
      };
      return vadStatusMap[vad.status] ?? "idle";
    }
    return "idle";
  };

  // Create GatewayClient
  const getClient = useCallback((): GatewayClient | null => {
    try {
      // In the overlay window, read credentials from localStorage
      // (they're set by the main window via connection-store)
      const stored = localStorage.getItem("hermes-connection");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const { gatewayUrl, apiKey } = parsed?.state ?? {};
      if (!gatewayUrl || !apiKey) return null;
      // In browser/dev mode, use relative URLs (Vite proxy handles it)
      const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
      return new GatewayClient(isTauri ? gatewayUrl : "", apiKey);
    } catch {
      return null;
    }
  }, []);

  // Send message to Gateway
  const handleSend = useCallback(
    async (text: string, screenshot?: string) => {
      const trimmed = text.trim();
      const hasScreenshot = !!screenshot;
      if ((!trimmed && !hasScreenshot) || isStreaming) return;

      setInputText("");
      setPendingScreenshot(null);

      // Build user message content (show text or note about screenshot)
      const userContent = trimmed || (hasScreenshot ? "[Screenshot]" : "");
      setMessages((prev) => [...prev, { role: "user", content: userContent }]);

      const client = getClient();
      if (!client) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Gateway not configured. Open the main app to set credentials.",
          },
        ]);
        return;
      }

      // Create session if needed
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        try {
          const session = await client.createSession();
          currentSessionId = session.id;
          setSessionId(currentSessionId);
        } catch {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Failed to create session." },
          ]);
          return;
        }
      }

      // Add placeholder assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      try {
        await client.chatStream(
          currentSessionId,
          trimmed || (hasScreenshot ? "Please analyze this screenshot." : ""),
          (event: GatewayEvent) => {
            switch (event.type) {
              case "assistant.delta":
                setMessages((prev) => {
                  const msgs = [...prev];
                  for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === "assistant" && msgs[i].content === "" || (i === msgs.length - 1 && msgs[i].role === "assistant")) {
                      msgs[i] = {
                        ...msgs[i],
                        content: msgs[i].content + event.delta,
                      };
                      break;
                    }
                  }
                  return msgs;
                });
                break;
              case "run.completed":
                setMessages((prev) => {
                  const msgs = [...prev];
                  for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === "assistant") {
                      msgs[i] = {
                        ...msgs[i],
                        content: event.content || msgs[i].content,
                      };
                      break;
                    }
                  }
                  return msgs;
                });
                setIsStreaming(false);
                break;
              case "run.error":
                setMessages((prev) => {
                  const msgs = [...prev];
                  for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === "assistant") {
                      msgs[i] = {
                        ...msgs[i],
                        content: msgs[i].content + `\n[Error: ${event.error}]`,
                      };
                      break;
                    }
                  }
                  return msgs;
                });
                setIsStreaming(false);
                break;
            }
          },
          hasScreenshot && screenshot ? { images: [screenshot] } : undefined,
        );
      } catch {
        setMessages((prev) => {
          const msgs = [...prev];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "assistant" && msgs[i].content === "") {
              msgs[i] = {
                ...msgs[i],
                content: "Connection error. Is the Gateway running?",
              };
              break;
            }
          }
          return msgs;
        });
        setIsStreaming(false);
      }
    },
    [isStreaming, sessionId, getClient],
  );

  // Handle send with optional screenshot
  const handleSendWithScreenshot = useCallback(() => {
    if (pendingScreenshot) {
      handleSend(inputText, pendingScreenshot);
    } else {
      handleSend(inputText);
    }
  }, [inputText, pendingScreenshot, handleSend]);

  // Auto-play TTS for new assistant messages (when not muted)
  useEffect(() => {
    if (isMuted || isStreaming || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content.trim()) {
      // Debounce — only speak after streaming completes (content is non-empty and streaming is done)
      const timer = setTimeout(() => {
        if (!isStreaming && lastMsg.content.trim()) {
          tts.speak(lastMsg.content);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [messages, isStreaming, isMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay last assistant message TTS
  const handleReplayTTS = useCallback(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content.trim());
    if (lastAssistant) {
      tts.speak(lastAssistant.content);
    }
  }, [messages, tts]);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        // Muting — stop any current playback
        tts.stop();
      }
      return !prev;
    });
  }, [tts]);

  // Handle Enter / Shift+Enter in input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendWithScreenshot();
      }
    },
    [inputText, handleSendWithScreenshot],
  );

  // Close overlay
  const handleClose = useCallback(async () => {
    tts.stop();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().hide();
    } catch {
      // Browser mode — nothing to hide
    }
    // Clean up VAD if active
    if (mode === "vad") {
      vad.stop();
    }
  }, [mode, vad, tts]);

  // Mode toggle cycle: Type → PTT → VAD → Type
  const cycleMode = useCallback(() => {
    const modes: OverlayMode[] = ["type", "ptt", "vad"];
    const currentIdx = modes.indexOf(mode);
    const nextIdx = (currentIdx + 1) % modes.length;
    setMode(modes[nextIdx]);
  }, [mode, setMode]);

  // Handle voice button actions for PTT mode
  const handleVoiceStart = useCallback(async () => {
    await voiceRecorder.startRecording();
  }, [voiceRecorder]);

  const handleVoiceStop = useCallback(async (): Promise<string> => {
    return voiceRecorder.stopRecording();
  }, [voiceRecorder]);

  // Pre-load Whisper model on mount
  useEffect(() => {
    if (mode === "ptt") {
      voiceRecorder.preloadModel();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mode label
  const modeLabels: Record<OverlayMode, { icon: React.ReactNode; label: string }> = {
    type: { icon: <Keyboard className="h-3 w-3" />, label: "Type" },
    ptt: { icon: <Mic className="h-3 w-3" />, label: "PTT" },
    vad: { icon: <Activity className="h-3 w-3" />, label: "VAD" },
  };

  // Find the last assistant message index (for replay button)
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].content.trim()) return i;
    }
    return -1;
  })();

  return (
    <div
      className="glass-surface rounded-xl overflow-hidden flex flex-col"
      style={{
        width: "400px",
        height: "300px",
        maxWidth: "90vw",
        maxHeight: "80vh",
        animation: "cmdk-scale 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      data-testid="compact-chat"
    >
      {/* Header bar — drag region + controls */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "var(--mac-toolbar)",
          borderBottom: "1px solid var(--mac-separator)",
          // Make this region draggable by Tauri
        }}
        data-tauri-drag-region
      >
        <StatusIndicator state={getIndicatorState()} />

        <div className="flex items-center gap-1">
          {/* TTS mute/unmute toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute TTS" : "Mute TTS"}
            aria-label={isMuted ? "Unmute TTS" : "Mute TTS"}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full",
              "mac-icon-btn",
              "transition-all duration-150",
              isMuted
                ? "dark:text-mac-tertiary-label light:text-gray-400"
                : "dark:text-mac-label light:text-black",
            )}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </button>

          {/* Mode toggle pill */}
          <button
            onClick={cycleMode}
            title={`Mode: ${modeLabels[mode].label} (click to cycle)`}
            aria-label={`Switch mode. Current: ${modeLabels[mode].label}`}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full",
              "text-[11px] font-medium",
              "transition-all duration-150",
              "mac-btn",
              "!h-6 !px-2",
            )}
          >
            {modeLabels[mode].icon}
            <span>{modeLabels[mode].label}</span>
          </button>

          {/* Screen share button */}
          <button
            onClick={
              screenShare.isSharing
                ? () => {
                    screenShare.stopSharing();
                  }
                : () => {
                    screenShare.startSharing();
                  }
            }
            title={screenShare.isSharing ? "Stop screen sharing" : "Share screen"}
            aria-label={
              screenShare.isSharing ? "Stop screen sharing" : "Share screen"
            }
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full",
              "mac-icon-btn transition-all duration-150",
              screenShare.isSharing
                ? "text-[#FF453A]"
                : "dark:text-mac-secondary-label light:text-gray-400",
            )}
          >
            {screenShare.isSharing ? (
              <MonitorOff className="h-3 w-3" />
            ) : (
              <Monitor className="h-3 w-3" />
            )}
          </button>

          {/* Settings button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Open settings"
              className="mac-icon-btn !w-6 !h-6"
            >
              <Settings className="h-3 w-3" />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            title="Close overlay"
            aria-label="Close overlay"
            className="mac-icon-btn !w-6 !h-6"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Screen preview — shown when sharing */}
      {screenShare.isSharing && screenShare.stream && (
        <div className="px-3 pt-2">
          <ScreenPreview
            stream={screenShare.stream}
            onCapture={handleScreenCapture}
          />
        </div>
      )}

      {/* Messages area — scrollable */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[11px] dark:text-mac-tertiary-label light:text-gray-400 opacity-60">
            Ask anything…
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "mb-2 text-[12px] leading-4",
                msg.role === "user"
                  ? "dark:text-mac-label light:text-black text-right"
                  : "dark:text-mac-secondary-label light:text-gray-600",
              )}
            >
              {msg.role === "user" ? (
                <span className="inline-block max-w-[90%] rounded-lg px-2 py-1 glass-input">
                  {msg.content}
                </span>
              ) : (
                <div className="flex items-start gap-1">
                  <span className="message-content flex-1">{msg.content}</span>
                  {/* Replay TTS button for last assistant message */}
                  {i === lastAssistantIdx && tts.status !== "speaking" && !isMuted && (
                    <button
                      onClick={handleReplayTTS}
                      title="Replay audio"
                      aria-label="Replay TTS"
                      className="flex-shrink-0 mt-0.5 mac-icon-btn !w-4 !h-4"
                    >
                      <Volume2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                  {tts.status === "speaking" && i === lastAssistantIdx && (
                    <span className="flex-shrink-0 mt-0.5 inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-3 py-2 flex flex-col gap-1.5"
        style={{
          borderTop: "1px solid var(--mac-separator)",
          background: "var(--mac-toolbar)",
        }}
      >
        {/* Pending screenshot thumbnail */}
        {pendingScreenshot && (
          <ScreenshotThumbnail
            dataUrl={pendingScreenshot}
            onRemove={() => setPendingScreenshot(null)}
          />
        )}

        <div className="flex items-end gap-2">
        {mode === "ptt" && (
          <VoiceButton
            status={voiceRecorder.status}
            onStart={handleVoiceStart}
            onStop={handleVoiceStop}
            isActive={true}
          />
        )}

        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={
            mode === "ptt"
              ? "Hold Space to talk…"
              : mode === "vad"
                ? "Speak or type…"
                : "Type a message…"
          }
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg px-3 py-2",
            "text-[12px] leading-4 min-h-[32px] max-h-[80px]",
            "glass-input",
            "dark:text-mac-label dark:placeholder:text-mac-tertiary-label",
            "light:text-black light:placeholder:text-gray-400",
            "focus:outline-none",
            isStreaming && "opacity-50",
          )}
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
          }}
          data-testid="compact-input"
        />

        <button
          onClick={handleSendWithScreenshot}
          disabled={isStreaming || (!inputText.trim() && !pendingScreenshot)}
          title="Send"
          aria-label="Send message"
          className={cn(
            "flex-shrink-0 flex items-center justify-center",
            "w-7 h-7 rounded-full",
            "mac-btn-primary",
            "transition-all duration-150",
            "active:scale-[0.92]",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          )}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
        </div>
      </div>
    </div>
  );
}
