// ---------------------------------------------------------------------------
// GatewayClient — Hermes Gateway HTTP client (Fetch-based)
// ---------------------------------------------------------------------------

export type GatewayEvent =
  | { type: "assistant.delta"; delta: string }
  | { type: "tool.started"; tool: string; args?: string }
  | { type: "tool.completed"; tool: string }
  | { type: "run.completed"; content: string }
  | { type: "run.error"; error: string };

export type OnGatewayEvent = (event: GatewayEvent) => void;

export interface Session {
  id: string;
  title: string | null;
  source: string;
  model: string;
  message_count: number;
  started_at: number;
  last_active: number;
  user_id?: string | null;
  preview?: string | null;
}

export interface SessionMessage {
  id: string;
  session_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// --- API response wrappers --------------------------------------------------

interface SessionWrapper {
  object: string;
  session: Session;
}

interface SessionsListResponse {
  object: string;
  data: Session[];
}

interface MessagesListResponse {
  object: string;
  session_id: string;
  data: SessionMessage[];
}

export interface HealthResponse {
  status: string;
  version?: string;
}

export interface HealthDetailedResponse {
  status: string;
  version?: string;
  uptime?: string;
  sessions_active?: number;
}

export interface ForkResult {
  id: string;
}

// --- Agent / Model info types -----------------------------------------------

/** Agent info from Gateway */
export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  model?: string;
}

/** Model info from Gateway */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export class GatewayClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GatewayClientError";
  }
}

// ---------------------------------------------------------------------------
// 401 detection — global callback invoked whenever any request returns 401
// ---------------------------------------------------------------------------

/** Callback type for 401 events. */
export type OnUnauthorizedCallback = () => void;

let onUnauthorized: OnUnauthorizedCallback | null = null;

/**
 * Register a global callback that fires when any GatewayClient request
 * receives a 401 response. Used by the ReAuthBanner to show a prompt.
 */
export function setOnUnauthorized(cb: OnUnauthorizedCallback | null): void {
  onUnauthorized = cb;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export class GatewayClient {
  private baseUrl: string;
  private apiKey: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  // ---- helpers -----------------------------------------------------------

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...extra,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      // Fire global callback on 401 so the UI can show a re-auth banner
      if (res.status === 401) {
        onUnauthorized?.();
      }
      throw new GatewayClientError(res.status, text);
    }

    return res.json() as Promise<T>;
  }

  // ---- endpoints ---------------------------------------------------------

  /** GET /health */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health");
  }

  /** GET /health/detailed */
  async healthDetailed(): Promise<HealthDetailedResponse> {
    return this.request<HealthDetailedResponse>("GET", "/health/detailed");
  }

  /** POST /api/sessions — API requires {} body, returns { object, session } */
  async createSession(title?: string): Promise<Session> {
    const res = await this.request<SessionWrapper>(
      "POST",
      "/api/sessions",
      { ...(title !== undefined && { title }) },
    );
    return res.session;
  }

  /** GET /api/sessions — returns { object, data: Session[] } */
  async listSessions(limit?: number, offset?: number): Promise<Session[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    const qs = params.toString();
    const res = await this.request<SessionsListResponse>(
      "GET",
      `/api/sessions${qs ? `?${qs}` : ""}`,
    );
    return res.data ?? [];
  }

  /** GET /api/sessions/{id}/messages — returns { object, session_id, data } */
  async getSessionMessages(
    id: string,
    limit?: number,
  ): Promise<SessionMessage[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    const qs = params.toString();
    const res = await this.request<MessagesListResponse>(
      "GET",
      `/api/sessions/${encodeURIComponent(id)}/messages${qs ? `?${qs}` : ""}`,
    );
    return res.data ?? [];
  }

  /** PATCH /api/sessions/{id} — returns { object, session } */
  async patchSession(
    id: string,
    data: Partial<Pick<Session, "title">>,
  ): Promise<Session> {
    const res = await this.request<SessionWrapper>(
      "PATCH",
      `/api/sessions/${encodeURIComponent(id)}`,
      data,
    );
    return res.session;
  }

  /** DELETE /api/sessions/{id} */
  async deleteSession(id: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/sessions/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: this.headers() },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      if (res.status === 401) {
        onUnauthorized?.();
      }
      throw new GatewayClientError(res.status, text);
    }
  }

  /** GET /api/agents — returns available agents (graceful 404 fallback) */
  async listAgents(): Promise<AgentInfo[]> {
    try {
      const res = await this.request<{ data: AgentInfo[] }>("GET", "/api/agents");
      return res.data ?? [];
    } catch (err) {
      // Endpoint not implemented yet — return default list
      if (err instanceof GatewayClientError && err.status === 404) {
        return [
          { id: "default", name: "Default Agent", description: "Main Hermes agent" },
        ];
      }
      throw err;
    }
  }

  /** GET /api/models — returns available models (graceful 404 fallback) */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await this.request<{ data: ModelInfo[] }>("GET", "/api/models");
      return res.data ?? [];
    } catch (err) {
      if (err instanceof GatewayClientError && err.status === 404) {
        return [
          { id: "default", name: "Default Model", provider: "default" },
        ];
      }
      throw err;
    }
  }

  /**
   * POST /api/sessions/{id}/chat/stream — Server-Sent Events
   *
   * Calls `onEvent` for every parsed SSE event. Returns when the stream ends
   * or throws on network / parse errors.
   */
  async chatStream(
    sessionId: string,
    message: string,
    onEvent: OnGatewayEvent,
    options?: { agent?: string; model?: string },
  ): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`;

    this.abortController = new AbortController();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers({ Accept: "text/event-stream" }),
        body: JSON.stringify({
          message,
          ...(options?.agent && { agent: options.agent }),
          ...(options?.model && { model: options.model }),
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "unknown error");
        if (res.status === 401) {
          onUnauthorized?.();
        }
        throw new GatewayClientError(res.status, text);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by double newline)
        const parts = buffer.split("\n\n");
        // Keep the last (potentially incomplete) chunk in the buffer
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const event = this.parseSSEEvent(part);
          if (event) {
            onEvent(event);
          }
        }
      }

      // Process any remaining data in the buffer
      if (buffer.trim()) {
        const event = this.parseSSEEvent(buffer.trim());
        if (event) {
          onEvent(event);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User-initiated stop — silently return
        return;
      }
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  /** Abort an in-progress chatStream call. */
  stopGeneration(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /** POST /api/sessions/{id}/fork — returns { object, session } */
  async forkSession(
    sessionId: string,
    messageIndex?: number,
  ): Promise<ForkResult> {
    const res = await this.request<SessionWrapper>(
      "POST",
      `/api/sessions/${encodeURIComponent(sessionId)}/fork`,
      { ...(messageIndex !== undefined && { message_index: messageIndex }) },
    );
    return { id: res.session.id };
  }

  // ---- SSE parser --------------------------------------------------------

  /**
   * Parse a single SSE event block into a GatewayEvent.
   *
   * Hermes SSE format:
   *   event: assistant.delta
   *   data: {"delta": "Hello", "message_id": "...", ...}
   *
   * We read the `event:` line for the event type, then map the `data:` JSON
   * into the typed GatewayEvent union.
   */
  private parseSSEEvent(chunk: string): GatewayEvent | null {
    const lines = chunk.split("\n");
    let eventType = "";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5));
      }
    }

    if (dataLines.length === 0) return null;

    const raw = dataLines.join("\n").trim();
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return this.mapSSEEvent(eventType, data);
    } catch {
      return null;
    }
  }

  /** Map Hermes SSE event type + data into a typed GatewayEvent. */
  private mapSSEEvent(eventType: string, data: Record<string, unknown>): GatewayEvent | null {
    switch (eventType) {
      case "assistant.delta":
        return { type: "assistant.delta", delta: String(data.delta ?? "") };

      case "assistant.completed": {
        // Final assembled message — best source for run.completed content
        const content = String(data.content ?? "");
        return content ? { type: "run.completed", content } : null;
      }

      case "run.completed": {
        // Fallback: extract from messages array if assistant.completed didn't fire
        const messages = data.messages as Array<Record<string, unknown>> | undefined;
        const content = messages?.[0]
          ? String(messages[0].content ?? "")
          : String(data.content ?? "");
        return content ? { type: "run.completed", content } : null;
      }

      case "run.error":
        return { type: "run.error", error: String(data.error ?? data.message ?? "Unknown error") };

      case "tool.started": {
        const toolName = String(data.tool_name ?? data.tool ?? "");
        const args = data.args;
        const argsStr = typeof args === "string" ? args : args ? JSON.stringify(args) : undefined;
        return { type: "tool.started", tool: toolName, args: argsStr };
      }

      case "tool.completed":
        return { type: "tool.completed", tool: String(data.tool_name ?? data.tool ?? "") };

      // Ignored event types (transitional / informational / thinking)
      case "run.started":
      case "message.started":
      case "message.delta":
      case "message.completed":
      case "tool.progress":
      case "thinking.delta":
      case "done":
      default:
        return null;
    }
  }
}

import { useConnectionStore } from "./connection-store";

// ---------------------------------------------------------------------------
// Factory — reads current credentials from store
// ---------------------------------------------------------------------------

/**
 * Detect if we're running inside Tauri (native window) or a browser.
 * In browser mode (Vite dev), API calls go through Vite proxy on port 1420.
 * In Tauri mode, API calls go directly to the configured gateway URL.
 */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function getGatewayClient(): GatewayClient {
  const { gatewayUrl, apiKey } = useConnectionStore.getState();
  if (!gatewayUrl || !apiKey) {
    throw new Error("Gateway not configured. Set credentials first.");
  }
  // In browser mode, use relative URLs — Vite proxy forwards to the gateway
  const baseUrl = isTauri() ? gatewayUrl : "";
  return new GatewayClient(baseUrl, apiKey);
}
