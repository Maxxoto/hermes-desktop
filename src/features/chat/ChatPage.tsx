import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, GitFork, Menu, X, Square, LogOut, Sun, Moon, PanelLeftClose, PanelLeftOpen, Columns2, Settings } from "lucide-react";
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
import { useKeyboardNavigation } from "../../hooks/use-keyboard-navigation";
import { useTheme } from "../../hooks/use-theme";
import { useDeleteSession } from "../sessions/use-sessions";
import { useAgentNotifications } from "../../hooks/use-agent-notifications";
import { CommandPalette, useCommandPaletteShortcut } from "../command-palette/CommandPalette";
import { useSessions } from "../sessions/use-sessions";
import { buildMarkdown } from "./ExportButton";
import { useLayoutStore } from "../layout/use-layout";
import ResizeHandle from "../layout/ResizeHandle";
import SplitView from "../layout/SplitView";
import AgentSelector from "../agents/AgentSelector";
import ModelPicker from "../agents/ModelPicker";
import { useFileUpload } from "../files/use-file-upload";
import DropZone from "../files/DropZone";
import { useSpaceShortcuts } from "../../hooks/use-space-shortcuts";
import { useSpaces } from "../spaces/use-spaces";
import TodayView from "../today/TodayView";
import { useTodayStore } from "../today/use-today-store";
import { useTodayShortcut } from "../../hooks/use-today-shortcut";

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

  // Layout store
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const splitView = useLayoutStore((s) => s.splitView);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleSplitView = useLayoutStore((s) => s.toggleSplitView);

  const autoTitle = useAutoTitle();

  // Space shortcuts (Cmd+1-9 to switch, Cmd+Shift+N to create)
  useSpaceShortcuts();

  // Space session binding
  const addSessionToActiveSpace = useSpaces((s) => s.addSessionToActiveSpace);

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

  // Agent / Model selection
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // File attachments
  const { files, addFiles, removeFile, clearFiles } = useFileUpload();

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
    navigate("/connection?edit=1");
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
    onToggleSidebar: toggleSidebar,
    onToggleSplitView: toggleSplitView,
  });

  // Global keyboard navigation (EPIC 9)
  const focusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hermes:focus-search"));
  }, []);

  useKeyboardNavigation({
    onNewChat: useCallback(() => {
      clear();
    }, [clear]),
    onDeleteSession: useCallback(() => {
      if (sessionId) {
        deleteSession.mutate(sessionId);
        clear();
      }
    }, [sessionId, deleteSession, clear]),
    onEditSession: undefined, // Handled by SessionItem directly
    onFocusSearch: focusSearch,
    onToggleSidebar: toggleSidebar,
    onBack: useCallback(() => {
      // Close command palette if open
      setShowCommandPalette(false);
    }, []),
  });

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      // Append file names to message if files are attached
      if (files.length > 0) {
        const fileNames = files
          .filter((f) => f.status !== "error")
          .map((f) => f.file.name)
          .join(", ");
        if (fileNames) {
          text = `${text}\n\n[Attached: ${fileNames}]`;
        }
        clearFiles();
      }

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
          // Add new session to the active space
          addSessionToActiveSpace(session.id);
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
          },
          {
            agent: selectedAgent ?? undefined,
            model: selectedModel ?? undefined,
          },
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
      selectedAgent,
      selectedModel,
      files,
      clearFiles,
      addSessionToActiveSpace,
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

  // ── Today view (EPIC 12) ────────────────────────────────────────────────
  const showTodayView = useTodayStore((s) => s.showTodayView);
  const toggleTodayView = useTodayStore((s) => s.toggleTodayView);
  useTodayShortcut(toggleTodayView);

  const handleOpenSessionFromToday = useCallback(
    async (id: string) => {
      toggleTodayView(); // close today view
      handleSelectSession(id);
    },
    [toggleTodayView, handleSelectSession]
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

  const handleRetry = useCallback(() => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    // Remove all messages after the last user message
    const userMsgIndex = messages.findIndex((m) => m.id === lastUserMsg.id);
    loadFromSession(messages.slice(0, userMsgIndex));
    // Re-send
    handleSend(lastUserMsg.content);
  }, [messages, loadFromSession, handleSend]);

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

  // ── Chat content (shared between single & split views) ───────────────────
  const chatMessages = (
    <DropZone onDrop={addFiles}>
      <div className="flex-1 overflow-y-auto message-content px-2 sm:px-4 py-2 sm:py-4">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full dark:text-mac-tertiary-label light:text-gray-400 min-h-[60vh]">
            <div className="relative">
              <div className="ambient-blob w-24 h-24 dark:bg-mac-accent/20 light:bg-blue-400/15 -top-4 -left-4" style={{ animationDelay: "0s" }} />
              <MessageSquare className="h-14 w-14 sm:h-16 sm:w-16 mb-3 opacity-30 relative z-10" />
            </div>
            <p className="text-[14px] font-semibold mt-2">Start a conversation</p>
            <p className="text-[11px] mt-1 opacity-60">Type a message below to begin chatting with Hermes</p>
            <p className="text-[10px] mt-4 opacity-30">
              Press <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: "rgba(255,255,255,0.08)" }}>⌘K</kbd> for commands
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onRetry={!isStreaming ? handleRetry : undefined} />
        ))}
        {/* Typing indicator when streaming with empty response */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-1.5 px-3 py-2 dark:text-mac-tertiary-label light:text-gray-400">
            <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full dark:bg-mac-secondary-label light:bg-gray-400" />
            <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full dark:bg-mac-secondary-label light:bg-gray-400" />
            <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full dark:bg-mac-secondary-label light:bg-gray-400" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      </div>
    </DropZone>
  );

  const chatInput = (
    <div className="flex items-end gap-2">
      {isStreaming && (
        <div className="flex-shrink-0 pb-3 pl-5">
          <button
            onClick={handleStopGeneration}
            title="Stop generation"
            aria-label="Stop generation"
            className="mac-icon-btn !w-9 !h-9 dark:hover:!bg-mac-red/20 dark:hover:text-mac-red light:hover:!bg-red-500/20 light:hover:text-red-500"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex-1">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          files={files}
          onFiles={addFiles}
          onRemoveFile={removeFile}
        />
      </div>
    </div>
  );

  // The primary chat panel content (toolbar + messages + input)
  const primaryChatPanel = (
    <>
      {/* Toolbar — glass panel */}
      <header className="toolbar vibrancy-toolbar flex items-center justify-between px-2 sm:px-4 glass-border-b min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowSidebar(true)}
            className="mac-icon-btn toolbar-hide-mobile"
            title="Open sessions"
            aria-label="Open sessions"
          >
            <Menu className="h-4 w-4" />
          </button>
          {/* Desktop sidebar collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="mac-icon-btn toolbar-show-desktop"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <AgentSelector value={selectedAgent} onChange={setSelectedAgent} />
          <ModelPicker value={selectedModel} onChange={setSelectedModel} />
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
            aria-label="Fork session"
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
            onClick={toggleSplitView}
            title={splitView ? "Exit split view" : "Toggle split view"}
            aria-label="Toggle split view"
            className="mac-icon-btn"
          >
            <Columns2 className="h-4 w-4" />
          </button>
          <button
            onClick={handlePaletteGoSettings}
            title="Settings"
            aria-label="Settings"
            className="mac-icon-btn"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
            aria-label="Disconnect"
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
      {chatMessages}

      {/* Input */}
      {chatInput}
    </>
  );

  // ── Sidebar width style ───────────────────────────────────────────────────
  const sidebarStyle: React.CSSProperties = sidebarCollapsed
    ? { width: 0, minWidth: 0 }
    : { width: sidebarWidth, minWidth: 0 };

  return (
    <div
      className="flex flex-1 min-h-0 dark:text-mac-label light:text-black overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16162a 50%, #0f0f23 100%)" }}
    >
      {/* Sidebar — glass panel with desktop collapse */}
      <aside
        data-testid="sidebar"
        className={`sidebar vibrancy-sidebar glass-border-r
          fixed inset-0 z-50 md:static md:z-auto
          flex flex-col sidebar-collapse-transition overflow-hidden
          ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={sidebarStyle}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
          <span className="text-[13px] font-semibold dark:text-mac-secondary-label light:text-gray-600">Sessions</span>
          <button onClick={() => setShowSidebar(false)} className="mac-icon-btn" aria-label="Close sessions">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`${sidebarCollapsed ? "md:hidden" : ""}`}>
          <SessionList
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={() => { handleNewSession(); setShowSidebar(false); }}
          />
        </div>
      </aside>

      {/* Resize handle — only on desktop when sidebar is visible */}
      {!sidebarCollapsed && <ResizeHandle />}

      {/* Overlay backdrop for mobile */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Main chat area — Today view replaces content when active */}
      <div className="flex-1 flex flex-col min-w-0">
        {showTodayView ? (
          <TodayView onOpenSession={handleOpenSessionFromToday} />
        ) : splitView ? (
          <SplitView
            onClose={toggleSplitView}
            leftPanel={primaryChatPanel}
            rightPanel={<SecondaryChatPanel />}
          />
        ) : (
          primaryChatPanel
        )}
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

// ═══════════════════════════════════════════════════════════════════════════
// Secondary Chat Panel — used in split view (right panel)
// ═══════════════════════════════════════════════════════════════════════════

function SecondaryChatPanel() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const handleSelectSession = useCallback(async (id: string) => {
    setSelectedSessionId(id);
    setLoading(true);
    try {
      const rawMsgs: SessionMessage[] = await getGatewayClient().getSessionMessages(id);
      const loaded: Message[] = rawMsgs.map((m, i) => ({
        id: `split_loaded_${i}`,
        role: m.role === "system" ? "assistant" : m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      setSessionMessages(loaded);
    } catch {
      setSessionMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionMessages]);

  return (
    <div className="flex flex-col h-full dark:text-mac-label light:text-black">
      {/* Session selector header */}
      <header className="toolbar vibrancy-toolbar flex items-center justify-between px-2 sm:px-4 glass-border-b min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 dark:text-mac-blue light:text-blue-600 flex-shrink-0" />
          <span className="text-[13px] font-medium truncate">
            {selectedSessionId
              ? `Session ${selectedSessionId.slice(0, 8)}…`
              : "Select a session"}
          </span>
        </div>
      </header>

      {/* Session list */}
      <div className="border-b dark:border-white/10 light:border-black/10 overflow-y-auto max-h-[200px]">
        <SessionList
          activeSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
        />
      </div>

      {/* Messages display */}
      <div className="flex-1 overflow-y-auto message-content px-2 sm:px-4 py-2 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full dark:text-mac-tertiary-label light:text-gray-400">
            <p className="text-[13px]">Loading messages…</p>
          </div>
        ) : sessionMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full dark:text-mac-tertiary-label light:text-gray-400 min-h-[30vh]">
            <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-[13px]">Select a session to view messages</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {sessionMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
