import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, GitFork, Menu, X, Square, LogOut } from "lucide-react";
import { useChatStore, type Message } from "./use-chat-store";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import SessionList from "../sessions/SessionList";
import ForkDialog from "./ForkDialog";
import CompressButton from "./CompressButton";
import {
  getGatewayClient,
  type SessionMessage,
} from "../connection/gateway-api";
import { useConnectionStore } from "../connection/connection-store";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showForkDialog, setShowForkDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

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
      if (!currentSessionId) {
        try {
          const session = await getGatewayClient().createSession();
          currentSessionId = session.id;
          setSession(currentSessionId);
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

  return (
    <div className="flex flex-1 min-h-0 bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar — hidden on mobile, overlay when toggled */}
      <aside className={`
        fixed inset-0 z-50 md:static md:z-auto
        md:w-64 md:flex-shrink-0 md:border-r md:border-gray-800 md:bg-gray-900/50
        bg-gray-900/95 backdrop-blur-sm
        flex flex-col transition-transform duration-200
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-3 pt-3 pb-1 md:hidden">
          <span className="text-sm font-semibold text-gray-300">Sessions</span>
          <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer">
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
        {/* Toolbar */}
        <header className="flex items-center justify-between px-2 sm:px-5 py-2 sm:py-3 border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm min-h-[48px]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer md:hidden"
              title="Open sessions"
            >
              <Menu className="h-4 w-4" />
            </button>
            <MessageSquare className="h-4 w-4 text-blue-400 flex-shrink-0 hidden sm:block" />
            <span className="text-sm font-medium truncate">
              {sessionId
                ? `Session ${sessionId.slice(0, 8)}…`
                : "New Chat"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowForkDialog(true)}
              title="Fork session"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
              disabled={!sessionId}
            >
              <GitFork className="h-4 w-4" />
            </button>
            {sessionId && (
              <CompressButton messageCount={messages.length} />
            )}
            <button
              onClick={handleLogout}
              title="Disconnect and go back"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
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
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 min-h-[60vh]">
                <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-40" />
                <p className="text-sm">Start a conversation</p>
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
            <div className="flex-shrink-0 pb-3 pl-4">
              <button
                onClick={handleStopGeneration}
                title="Stop generation"
                className="p-2.5 rounded-xl bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <Square className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="flex-1">
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      </div>
    </div>
  );
}
