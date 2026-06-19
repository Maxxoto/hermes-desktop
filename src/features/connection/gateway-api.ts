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
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface SessionsResponse {
  items: Session[];
  total: number;
  page: number;
  per_page: number;
}

export interface MessagesResponse {
  items: SessionMessage[];
  total: number;
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
// Client
// ---------------------------------------------------------------------------
export class GatewayClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  // ---- helpers -----------------------------------------------------------

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
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

  /** POST /api/sessions */
  async createSession(title?: string): Promise<Session> {
    return this.request<Session>(
      "POST",
      "/api/sessions",
      title !== undefined ? { title } : undefined,
    );
  }

  /** GET /api/sessions */
  async listSessions(limit?: number, offset?: number): Promise<Session[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    const qs = params.toString();
    return this.request<Session[]>(
      "GET",
      `/api/sessions${qs ? `?${qs}` : ""}`,
    );
  }

  /** GET /api/sessions/{id}/messages */
  async getSessionMessages(
    id: string,
    limit?: number,
  ): Promise<SessionMessage[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request<SessionMessage[]>(
      "GET",
      `/api/sessions/${encodeURIComponent(id)}/messages${qs ? `?${qs}` : ""}`,
    );
  }

  /** PATCH /api/sessions/{id} */
  async patchSession(
    id: string,
    data: Partial<Pick<Session, "title">>,
  ): Promise<Session> {
    return this.request<Session>(
      "PATCH",
      `/api/sessions/${encodeURIComponent(id)}`,
      data,
    );
  }

  /** DELETE /api/sessions/{id} */
  async deleteSession(id: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/sessions/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: this.headers() },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new GatewayClientError(res.status, text);
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
  ): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers({ Accept: "text/event-stream" }),
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
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
  }

  /** POST /api/sessions/{id}/fork */
  async forkSession(
    sessionId: string,
    messageIndex?: number,
  ): Promise<ForkResult> {
    return this.request<ForkResult>(
      "POST",
      `/api/sessions/${encodeURIComponent(sessionId)}/fork`,
      messageIndex !== undefined ? { message_index: messageIndex } : undefined,
    );
  }

  // ---- SSE parser --------------------------------------------------------

  private parseSSEEvent(chunk: string): GatewayEvent | null {
    const lines = chunk.split("\n");
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5));
      }
    }

    if (dataLines.length === 0) return null;

    const raw = dataLines.join("\n").trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw) as GatewayEvent;
    } catch {
      return null;
    }
  }
}

import { useConnectionStore } from "./connection-store";

// ---------------------------------------------------------------------------
// Factory — reads current credentials from store
// ---------------------------------------------------------------------------

export function getGatewayClient(): GatewayClient {
  const { gatewayUrl, apiKey } = useConnectionStore.getState();
  if (!gatewayUrl || !apiKey) {
    throw new Error("Gateway not configured. Set credentials first.");
  }
  return new GatewayClient(gatewayUrl, apiKey);
}
