# Hermes Desktop — Test Plan

**Version:** 0.1.0  
**Date:** 2026-06-20  
**App:** Tauri v2 + React 19 + TypeScript  
**Target Gateway:** Hermes Gateway API (localhost:8642, Vite proxy on 1420)

---

## 1. Scope

This test plan covers the MVP features of Hermes Desktop:

| # | Feature Area | Description |
|---|---|---|
| F1 | Connection & Authentication | Store credentials, connect to gateway, validate API key |
| F2 | Session Management | Create, list, patch, delete, fork sessions |
| F3 | Chat & Streaming | Send messages, receive SSE stream, display responses |
| F4 | Session List UI | Grouped display, search, loading/empty states |
| F5 | Gateway API Client | HTTP client, response parsing, error handling |

---

## 2. Test Cases

### F1 — Connection & Authentication

| ID | Test Case | Type | Automated |
|----|-----------|------|-----------|
| F1-01 | setCredentials stores URL + API key in store | Unit | ✅ |
| F1-02 | clearCredentials resets store to empty | Unit | ✅ |
| F1-03 | getGatewayClient uses stored values | Unit | ✅ |
| F1-04 | getGatewayClient throws if not configured | Unit | ✅ |
| F1-05 | Invalid API key returns 401 from gateway | Integration | ✅ |

### F2 — Session Management

| ID | Test Case | Type | Automated |
|----|-----------|------|-----------|
| F2-01 | createSession sends `{}` body, unwraps `.session` | Unit | ✅ |
| F2-02 | listSessions returns unwrapped `Session[]` | Unit | ✅ |
| F2-03 | listSessions supports limit/offset params | Unit | ✅ |
| F2-04 | patchSession sends PATCH, unwraps `.session` | Unit | ✅ |
| F2-05 | forkSession sends `{}` body, returns `{ id }` | Unit | ✅ |
| F2-06 | deleteSession sends DELETE and succeeds | Unit | ✅ |
| F2-07 | Create → list → verify it appears | Integration | ✅ |
| F2-08 | Create → patch title → verify changed | Integration | ✅ |
| F2-09 | Create → get messages → verify empty array | Integration | ✅ |
| F2-10 | Create → fork → verify fork exists → delete both | Integration | ✅ |
| F2-11 | Cleanup: delete all `test_` prefixed sessions | Integration | ✅ |

### F3 — Chat & Streaming

| ID | Test Case | Type | Automated |
|----|-----------|------|-----------|
| F3-01 | Parse `assistant.delta` SSE event | Unit | ✅ |
| F3-02 | Parse `tool.started` with tool_name + args | Unit | ✅ |
| F3-03 | Parse `tool.completed` event | Unit | ✅ |
| F3-04 | Parse `assistant.completed` → maps to `run.completed` | Unit | ✅ |
| F3-05 | Parse `run.completed` with messages array | Unit | ✅ |
| F3-06 | Parse `run.error` event | Unit | ✅ |
| F3-07 | Ignore `tool.progress`, `run.started`, `done` events | Unit | ✅ |
| F3-08 | Handle malformed JSON gracefully (return null) | Unit | ✅ |
| F3-09 | Handle missing event line (return null) | Unit | ✅ |
| F3-10 | Chat stream → verify events received | Integration | ✅ |

### F4 — Session List UI

| ID | Test Case | Type | Automated |
|----|-----------|------|-----------|
| F4-01 | Renders loading skeleton when loading | Unit (RTL) | ✅ |
| F4-02 | Renders empty state when no sessions | Unit (RTL) | ✅ |
| F4-03 | Renders grouped sessions (Today, Yesterday, Older) | Unit (RTL) | ✅ |
| F4-04 | Search filter matches by title/model/source | Unit (RTL) | ✅ |
| F4-05 | Click handler fires with session ID | Unit (RTL) | ✅ |

### F5 — Gateway API Client (Error Handling)

| ID | Test Case | Type | Automated |
|----|-----------|------|-----------|
| F5-01 | HTTP 4xx throws GatewayClientError with status | Unit | ✅ |
| F5-02 | HTTP 5xx throws GatewayClientError with status | Unit | ✅ |
| F5-03 | Network error propagates | Unit | ✅ |
| F5-04 | health() returns HealthResponse | Unit | ✅ |
| F5-05 | health() integration test against live gateway | Integration | ✅ |

---

## 3. Pass/Fail Criteria

### Automated Tests

- **PASS**: All tests in a suite pass with 0 failures
- **FAIL**: Any test throws an assertion error or unhandled exception
- **WARN**: A test is skipped (`.skip`) due to known environment issue

### Integration Tests

- Require a running Vite dev server (`npm run dev`) with gateway proxy
- `beforeAll` verifies connectivity; if gateway unreachable, entire suite is skipped
- All test sessions use `test_` prefix and are cleaned up in `afterAll`

### Manual Test Checklist (not automated)

| ID | Manual Test Case |
|----|-----------------|
| M-01 | Launch app, verify splash screen / loading indicator |
| M-02 | Connect to gateway via settings dialog |
| M-03 | Send a real message and verify streaming response renders |
| M-04 | Verify session list auto-refreshes |
| M-05 | Verify keyboard shortcuts (if any) |
| M-06 | Resize window — layout responds correctly |
| M-07 | Disconnect network — verify error state shown |

---

## 4. Test Execution

```bash
# Run all tests
npm test

# Unit tests only (mocked fetch, no network)
npm run test:unit

# Integration tests only (requires live gateway)
npm run test:integration
```

### Environment Requirements

- Node.js 18+
- Vite dev server running on port 1420 (for integration tests)
- Gateway running on port 8642 (proxied through Vite)
- API key: `hm-desk-v1-2026`

---

## 5. Test File Structure

```
src/__tests__/
├── gateway-api.test.ts              # Unit tests (mocked fetch)
├── gateway-api-integration.test.ts  # Integration tests (live API)
├── connection-store.test.ts         # Zustand store tests
├── SSE-parser.test.ts               # SSE parser tests
└── SessionList.test.tsx             # React component tests
```
