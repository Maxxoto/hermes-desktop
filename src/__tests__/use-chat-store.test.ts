/**
 * use-chat-store.test.ts — Unit tests for the Zustand chat store
 *
 * Tests all state transitions: setSession, addMessage, appendToLastAssistant,
 * addToolProgress, finalizeTool, setStreaming, loadFromSession, clear.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../features/chat/use-chat-store";

describe("use-chat-store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChatStore.getState().clear();
  });

  // ---- Initial state -------------------------------------------------------

  it("has initial empty state", () => {
    const state = useChatStore.getState();
    expect(state.sessionId).toBe(null);
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
  });

  // ---- setSession ----------------------------------------------------------

  describe("setSession()", () => {
    it("sets the session ID", () => {
      useChatStore.getState().setSession("sess_123");
      expect(useChatStore.getState().sessionId).toBe("sess_123");
    });

    it("overwrites a previous session ID", () => {
      useChatStore.getState().setSession("first");
      useChatStore.getState().setSession("second");
      expect(useChatStore.getState().sessionId).toBe("second");
    });
  });

  // ---- addMessage ----------------------------------------------------------

  describe("addMessage()", () => {
    it("appends a user message", () => {
      useChatStore.getState().addMessage({
        id: "u1",
        role: "user",
        content: "Hello",
        timestamp: 1000,
      });
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("Hello");
      expect(msgs[0].role).toBe("user");
    });

    it("appends multiple messages in order", () => {
      const { addMessage } = useChatStore.getState();
      addMessage({ id: "u1", role: "user", content: "Hi", timestamp: 1 });
      addMessage({ id: "a1", role: "assistant", content: "Hello!", timestamp: 2 });
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(2);
      expect(msgs[0].id).toBe("u1");
      expect(msgs[1].id).toBe("a1");
    });

    it("preserves toolCalls on messages", () => {
      useChatStore.getState().addMessage({
        id: "a1",
        role: "assistant",
        content: "",
        timestamp: 1,
        toolCalls: [{ tool: "bash", status: "completed" }],
      });
      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls).toEqual([{ tool: "bash", status: "completed" }]);
    });
  });

  // ---- appendToLastAssistant -----------------------------------------------

  describe("appendToLastAssistant()", () => {
    it("appends text to the last assistant message", () => {
      const { addMessage, appendToLastAssistant } = useChatStore.getState();
      addMessage({ id: "u1", role: "user", content: "Hi", timestamp: 1 });
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 2 });

      appendToLastAssistant("Hello");
      appendToLastAssistant(" world");

      expect(useChatStore.getState().messages[1].content).toBe("Hello world");
    });

    it("appends to the correct assistant when multiple exist", () => {
      const { addMessage, appendToLastAssistant } = useChatStore.getState();
      addMessage({ id: "u1", role: "user", content: "Q1", timestamp: 1 });
      addMessage({ id: "a1", role: "assistant", content: "A1", timestamp: 2 });
      addMessage({ id: "u2", role: "user", content: "Q2", timestamp: 3 });
      addMessage({ id: "a2", role: "assistant", content: "", timestamp: 4 });

      appendToLastAssistant("A2 content");

      const msgs = useChatStore.getState().messages;
      expect(msgs[1].content).toBe("A1"); // unchanged
      expect(msgs[3].content).toBe("A2 content"); // updated
    });

    it("does nothing when no assistant message exists", () => {
      const { appendToLastAssistant } = useChatStore.getState();
      appendToLastAssistant("orphan text");
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  // ---- addToolProgress -----------------------------------------------------

  describe("addToolProgress()", () => {
    it("adds a running tool call to the last assistant message", () => {
      const { addMessage, addToolProgress } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });

      addToolProgress("bash", '{ "command": "ls" }');

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls).toEqual([
        { tool: "bash", status: "running", args: '{ "command": "ls" }' },
      ]);
    });

    it("adds multiple tool calls to the same assistant message", () => {
      const { addMessage, addToolProgress } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });

      addToolProgress("bash");
      addToolProgress("web_search");

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls).toHaveLength(2);
      expect(msg.toolCalls![0].tool).toBe("bash");
      expect(msg.toolCalls![1].tool).toBe("web_search");
    });

    it("works without args (undefined)", () => {
      const { addMessage, addToolProgress } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });

      addToolProgress("no_args_tool");

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls).toEqual([
        { tool: "no_args_tool", status: "running", args: undefined },
      ]);
    });

    it("does nothing when no assistant message exists", () => {
      const { addToolProgress } = useChatStore.getState();
      addToolProgress("bash");
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  // ---- finalizeTool --------------------------------------------------------

  describe("finalizeTool()", () => {
    it("marks a tool as completed", () => {
      const { addMessage, addToolProgress, finalizeTool } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });
      addToolProgress("bash");

      finalizeTool("bash");

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls![0].status).toBe("completed");
    });

    it("marks a tool as failed when failed=true", () => {
      const { addMessage, addToolProgress, finalizeTool } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });
      addToolProgress("bash");

      finalizeTool("bash", true);

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls![0].status).toBe("failed");
    });

    it("only finalizes the matching tool, leaving others running", () => {
      const { addMessage, addToolProgress, finalizeTool } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });
      addToolProgress("bash");
      addToolProgress("web_search");

      finalizeTool("bash");

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls![0].status).toBe("completed");
      expect(msg.toolCalls![1].status).toBe("running");
    });

    it("does nothing when the tool name doesn't match", () => {
      const { addMessage, addToolProgress, finalizeTool } = useChatStore.getState();
      addMessage({ id: "a1", role: "assistant", content: "", timestamp: 1 });
      addToolProgress("bash");

      finalizeTool("nonexistent");

      const msg = useChatStore.getState().messages[0];
      expect(msg.toolCalls![0].status).toBe("running");
    });
  });

  // ---- setStreaming --------------------------------------------------------

  describe("setStreaming()", () => {
    it("sets streaming to true", () => {
      useChatStore.getState().setStreaming(true);
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("sets streaming to false", () => {
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setStreaming(false);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  // ---- loadFromSession -----------------------------------------------------

  describe("loadFromSession()", () => {
    it("replaces all messages with the given array", () => {
      const { addMessage, loadFromSession } = useChatStore.getState();
      addMessage({ id: "u1", role: "user", content: "old", timestamp: 1 });

      loadFromSession([
        { id: "new1", role: "user", content: "new", timestamp: 10 },
        { id: "new2", role: "assistant", content: "resp", timestamp: 11 },
      ]);

      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(2);
      expect(msgs[0].id).toBe("new1");
      expect(msgs[1].id).toBe("new2");
    });

    it("clears messages when given empty array", () => {
      const { addMessage, loadFromSession } = useChatStore.getState();
      addMessage({ id: "u1", role: "user", content: "x", timestamp: 1 });

      loadFromSession([]);

      expect(useChatStore.getState().messages).toEqual([]);
    });
  });

  // ---- clear ---------------------------------------------------------------

  describe("clear()", () => {
    it("resets all state to initial values", () => {
      const s = useChatStore.getState();
      s.setSession("sess_abc");
      s.addMessage({ id: "u1", role: "user", content: "Hi", timestamp: 1 });
      s.setStreaming(true);

      s.clear();

      const state = useChatStore.getState();
      expect(state.sessionId).toBe(null);
      expect(state.messages).toEqual([]);
      expect(state.isStreaming).toBe(false);
    });

    it("is idempotent (calling twice is safe)", () => {
      useChatStore.getState().clear();
      useChatStore.getState().clear();
      expect(useChatStore.getState().messages).toEqual([]);
    });
  });
});
