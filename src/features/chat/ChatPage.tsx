import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, GitFork, Menu, X, Square, LogOut, Sun, Moon } from "lucide-react";
import { useChatStore, type Message } from "./use-chat-store";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import SessionList from "../sessions/SessionList";
import ForkDialog from "./ForkDialog";
import CompressButton from "./CompressButton";
import { ExportButton } from "./ExportButton";
import { useAutoTitle } from "../sessions/use-sessions";
import {
  getGatewayClient,
  type SessionMessage,
} from "../connection/gateway-api";
import { useConnectionStore } from "../connection/connection-store";
import { useWindowTitle } from "../../hooks/use-window-title";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useTheme } from "../../hooks/use-theme";
import { useDeleteSession } from "../sessions/use-sessions";
import { useAgentNotifications } from "../../hooks/use-agent-notifications";
import { CommandPalette, useCommandPaletteShortcut } from "../command-palette/CommandPalette";
import { useSessions } from "../sessions/use-sessions";
import { buildMarkdown } from "./ExportButton";

export default function ChatPage() {
  const navigate = useNavigate();

  const {
    sessionId,
    messages,
    isStreaming,
    setSession,
    addMessage,
    appendToLastAssistant,
    addToolProgress,
    finalizeTool,
    setStreaming,
    loadFromSession,
    clear,
  } = useChatStore();

  const autoTitle = useAutoTitle();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showForkDialog, setShowForkDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Window title — derive from first user message or session ID
  const sessionTitle = sessionId
    ? messages.find((m) => m.role === "user")?.content.slice(0, 60) || `Session ${sessionId.slice(0, 8)}`
    : "New Chat";
  useWindowTitle(sessionTitle);

  // Session delete mutation (for Cmd+Backspace shortcut)
  const deleteSession = useDeleteSession();

  // Notifications — fires when agent completes a response while window is unfocused
  const { notifyOnCompletion } = useAgentNotifications();

  // Theme toggle
  const { theme, toggleTheme } = useTheme();

  // Command palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Sessions for the command palette
  const { data: paletteSessions = [] } = useSessions();

  // Cmd+K / Ctrl+K toggles the palette
  useCommandPaletteShortcut(useCallback(() => {
    setShowCommandPalette((prev) => !prev);
  }, []));

  // ── Command palette action handlers ──────────────────────────────────────

  const handlePaletteExport = useCallback(() => {
    if (messages.length === 0) return;
    const safeFilename = sessionTitle
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .trim()
      .slice(0, 60) || "chat";
    const markdown = buildMarkdown(sessionTitle, messages);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, sessionTitle]);

  const handlePaletteCopyId = useCallback(async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
    } catch {
      // clipboard API may not be available — ignore
    }
  }, [sessionId]);

  const handlePaletteGoSettings = useCallback(() => {
    navigate("/connection");
  }, [navigate]);

  const handlePaletteGoCurrent = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      "textarea[data-chat-input], input[data-chat-input]"
    );
    input?.focus();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewSession: useCallback(() => {
      clear();
    }, [clear]),
    onDeleteSession: useCallback(() => {
      if (sessionId) {
        deleteSession.mutate(sessionId);
        clear();
      }
    }, [sessionId, deleteSession, clear]),
  });

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const ts = Date.now() / 1000;

      // add user message
      addMessage({
        id: `user_${Date.now()}`,
        role: "user",
        content: text,
        timestamp: ts,
      });

      // ensure we have a session
      let currentSessionId = sessionId;
      let isNewSession = false;
      if (!currentSessionId) {
        try {
          const session = await getGatewayClient().createSession();
          currentSessionId = session.id;
          setSession(currentSessionId);
          isNewSession = true;
        } catch (err) {
          addMessage({
            id: `err_${Date.now()}`,
            role: "assistant",
            content: `Failed to create session: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now() / 1000,
          });
          return;
        }
      }

      // add placeholder assistant message
      const assistantId = `assistant_${Date.now()}`;
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now() / 1000,
      });

      setStreaming(true);

      try {
        await getGatewayClient().chatStream(
          currentSessionId,
          text,
          (event) => {
            switch (event.type) {
              case "assistant.delta":
                appendToLastAssistant(event.delta);
                break;
              case "tool.started":
                addToolProgress(event.tool, event.args);
                break;
              case "tool.completed":
                finalizeTool(event.tool);
                break;
              case "run.completed":
                if (event.content) {
                  const store = useChatStore.getState();
                  store.loadFromSession(
                    store.messages.map((m) =>
                      m.id === assistantId && m.content === ""
                        ? { ...m, content: event.content }
                        : m
                    )
                  );
                }
                setStreaming(false);
                // Notify if window is not focused
                if (!document.hasFocus()) {
                  const summary = event.content
                    ? event.content.slice(0, 120) + (event.content.length > 120 ? "…" : "")
                    : "Response complete";
                  notifyOnCompletion(summary);
                }
                // Auto-title: fire once after the first exchange in a new session
                if (isNewSession) {
                  autoTitle.mutate({ id: currentSessionId!, message: text });
                  isNewSession = false;
                }
                break;
              case "run.error":
                appendToLastAssistant(`\n\n[Error: ${event.error}]`);
                setStreaming(false);
                break;
            }
          }
        );
      } catch (err) {
        const store = useChatStore.getState();
        const msgs = store.messages.map((m) =>
          m.id === assistantId && m.content === ""
            ? { ...m, content: `Connection error: ${err instanceof Error ? err.message : String(err)}` }
            : m
        );
        store.loadFromSession(msgs);
        setStreaming(false);
      }
    },
    [
      sessionId,
      addMessage,
      appendToLastAssistant,
      addToolProgress,
      finalizeTool,
      setSession,
      setStreaming,
      autoTitle,
      notifyOnCompletion,
    ]
  );

  const handleSelectSession = useCallback(
    async (id: string) => {
      setSession(id);
      setShowSidebar(false);
      try {
        const rawMsgs: SessionMessage[] = await getGatewayClient().getSessionMessages(id);
        const loaded: Message[] = rawMsgs.map((m, i) => ({
          id: `loaded_${i}`,
          role: m.role === "system" ? "assistant" : m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        loadFromSession(loaded);
      } catch {
        loadFromSession([]);
      }
    },
    [setSession, loadFromSession]
  );

  const handleNewSession = useCallback(() => {
    clear();
  }, [clear]);

  const handleForked = useCallback(
    async (newSessionId: string) => {
      setSession(newSessionId);
      try {
        const rawMsgs: SessionMessage[] = await getGatewayClient().getSessionMessages(newSessionId);
        const loaded: Message[] = rawMsgs.map((m, i) => ({
          id: `loaded_${i}`,
          role: m.role === "system" ? "assistant" : m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        loadFromSession(loaded);
      } catch {
        loadFromSession([]);
      }
    },
    [setSession, loadFromSession],
  );

  const handleStopGeneration = useCallback(() => {
    getGatewayClient().stopGeneration();
    setStreaming(false);
  }, [setStreaming]);

  const handleLogout = useCallback(async () => {
    useConnectionStore.getState().clear();
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("store_credentials", { url: "", apiKey: "" });
    } catch {
      // invoke might fail in browser mode — ignore
    }
    navigate("/");
  }, [navigate]);

  // Command palette actions — assembled after all handlers are defined
  const paletteActions = useMemo(
    () => ({
      onNewSession: handleNewSession,
      onToggleTheme: toggleTheme,
      onExportChat: handlePaletteExport,
      onDisconnect: handleLogout,
      onCopySessionId: handlePaletteCopyId,
      onGoToSettings: handlePaletteGoSettings,
      onGoToCurrentSession: handlePaletteGoCurrent,
      onSelectSession: handleSelectSession,
    }),
    [
      handleNewSession,
      toggleTheme,
      handlePaletteExport,
      handleLogout,
      handlePaletteCopyId,
      handlePaletteGoSettings,
      handlePaletteGoCurrent,
      handleSelectSession,
    ],
  );

  return (
    <div className="flex flex-1 min-h-0 dark:text-mac-label light:text-black overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 50%, #0f0f23 100%)' }}>
      {/* Sidebar — glass panel */}
      <aside className={`sidebar vibrancy-sidebar glass-border-r
        fixed inset-0 z-50 md:static md:z-auto
        md:w-60 md:flex-shrink-0
        flex flex-col transition-transform duration-200
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
          <span className="text-[13px] font-semibold dark:text-mac-secondary-label light:text-gray-600">Sessions</span>
          <button onClick={() => setShowSidebar(false)} className="mac-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>
        <SessionList
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={() => { handleNewSession(); setShowSidebar(false); }}
        />
      </aside>
      {/* Overlay backdrop for mobile */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar — glass panel */}
        <header className="toolbar vibrancy-toolbar flex items-center justify-between px-2 sm:px-4 glass-border-b min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowSidebar(true)}
              className="mac-icon-btn md:hidden"
              title="Open sessions"
            >
              <Menu className="h-4 w-4" />
            </button>
            <MessageSquare className="h-4 w-4 dark:text-mac-blue light:text-blue-600 flex-shrink-0 hidden sm:block" />
            <span className="text-[13px] font-medium truncate">
              {sessionId
                ? `Session ${sessionId.slice(0, 8)}…`
                : "New Chat"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowForkDialog(true)}
              title="Fork session"
              className="mac-icon-btn"
              disabled={!sessionId}
            >
              <GitFork className="h-4 w-4" />
            </button>
            <ExportButton
              messages={messages}
              sessionTitle={sessionTitle}
              disabled={!sessionId}
            />
            {sessionId && (
              <CompressButton messageCount={messages.length} />
            )}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="mac-icon-btn"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleLogout}
              title="Disconnect and go back"
              className="mac-icon-btn"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <ForkDialog
          open={showForkDialog}
          onClose={() => setShowForkDialog(false)}
          onForked={handleForked}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto message-content px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full dark:text-mac-tertiary-label light:text-gray-400 min-h-[60vh]">
                <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-40" />
                <p className="text-[13px]">Start a conversation</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex items-end gap-2">
          {isStreaming && (
            <div className="flex-shrink-0 pb-3 pl-5">
              <button
                onClick={handleStopGeneration}
                title="Stop generation"
                className="mac-icon-btn !w-9 !h-9 dark:hover:!bg-mac-red/20 dark:hover:text-mac-red light:hover:!bg-red-500/20 light:hover:text-red-500"
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex-1">
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      </div>

      {/* Command Palette — Cmd+K / Ctrl+K */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        sessions={paletteSessions}
        currentSessionId={sessionId}
        actions={paletteActions}
      />
    </div>
  );
}
