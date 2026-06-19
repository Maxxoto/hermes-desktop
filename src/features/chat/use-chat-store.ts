import { create } from "zustand";

export interface ToolCall {
  tool: string;
  status: "running" | "completed" | "failed";
  args?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

interface ChatState {
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  setSession: (id: string) => void;
  addMessage: (msg: Message) => void;
  appendToLastAssistant: (text: string) => void;
  addToolProgress: (tool: string, args?: string) => void;
  finalizeTool: (toolName: string, failed?: boolean) => void;
  setStreaming: (v: boolean) => void;
  loadFromSession: (messages: Message[]) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,

  setSession: (id) => set({ sessionId: id }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  appendToLastAssistant: (text) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content: msgs[i].content + text };
          break;
        }
      }
      return { messages: msgs };
    }),

  addToolProgress: (tool, args) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          const toolCalls = msgs[i].toolCalls ?? [];
          toolCalls.push({ tool, status: "running", args });
          msgs[i] = { ...msgs[i], toolCalls };
          break;
        }
      }
      return { messages: msgs };
    }),

  finalizeTool: (toolName, failed) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          const toolCalls = (msgs[i].toolCalls ?? []).map((tc) =>
            tc.tool === toolName
              ? { ...tc, status: failed ? ("failed" as const) : ("completed" as const) }
              : tc
          );
          msgs[i] = { ...msgs[i], toolCalls };
          break;
        }
      }
      return { messages: msgs };
    }),

  setStreaming: (v) => set({ isStreaming: v }),

  loadFromSession: (messages) => set({ messages }),

  clear: () =>
    set({
      sessionId: null,
      messages: [],
      isStreaming: false,
    }),
}));
