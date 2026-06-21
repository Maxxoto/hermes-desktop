// Vitest setup — runs before every test file
import "@testing-library/jest-dom/vitest";
import "whatwg-fetch"; // polyfill fetch + Request/Response/Headers

// jsdom doesn't implement ResizeObserver — stub it (needed by cmdk)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom doesn't implement scrollIntoView — stub it (needed by cmdk)
if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

// Suppress console.error noise from expected test failures
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Ignore React act() warnings in component tests
  if (typeof args[0] === "string" && args[0].includes("act(")) return;
  originalError.call(console, ...args);
};
