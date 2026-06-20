/**
 * minimalism-overlay.test.tsx — Tests for EPIC 8: Minimalism Mode + Voice Control
 *
 * Tests: CompactChat, StatusIndicator, VoiceButton, useOverlayMode,
 *        useVoiceRecorder (Whisper STT), useVAD, useTTS
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusIndicator } from "../features/minimalism/StatusIndicator";
import { VoiceButton } from "../features/minimalism/VoiceButton";
import CompactChat from "../features/minimalism/CompactChat";
import { useOverlayMode, useOverlayWindow } from "../features/minimalism/use-overlay-window";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Tauri API
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    setFocus: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// Mock @xenova/transformers
const { mockTranscriber } = vi.hoisted(() => ({
  mockTranscriber: vi.fn().mockResolvedValue({ text: "hello world" }),
}));
vi.mock("@xenova/transformers", () => ({
  pipeline: vi.fn().mockResolvedValue(mockTranscriber),
}));

// Replace Audio globally for tests
const originalAudio = globalThis.Audio;

// Mock MediaRecorder
class MockMediaRecorder {
  state = "inactive";
  ondataavailable: ((event: unknown) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, _options?: unknown) {}
  start = vi.fn(function (this: MockMediaRecorder) {
    this.state = "recording";
  });
  stop = vi.fn(function (this: MockMediaRecorder) {
    this.state = "inactive";
  });
}

Object.defineProperty(window, "MediaRecorder", {
  value: MockMediaRecorder,
  writable: true,
});

(MockMediaRecorder as unknown as { isTypeSupported: (type: string) => boolean }).isTypeSupported = vi.fn(
  () => true,
);

// Mock getUserMedia
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((_index: number) => null),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock AudioContext for whisper blob conversion
class MockAudioContext {
  state = "running";
  decodeAudioData = vi.fn().mockResolvedValue({
    numberOfChannels: 1,
    length: 1024,
    sampleRate: 44100,
    duration: 1,
    getChannelData: () => new Float32Array(1024),
  });
  close = vi.fn().mockResolvedValue(undefined);
}

Object.defineProperty(window, "AudioContext", {
  value: MockAudioContext,
  writable: true,
});

// Mock URL.createObjectURL / revokeObjectURL
if (typeof window.URL.createObjectURL !== "function") {
  Object.defineProperty(window.URL, "createObjectURL", {
    value: vi.fn(() => "blob:mock-url"),
    writable: true,
  });
}
if (typeof window.URL.revokeObjectURL !== "function") {
  Object.defineProperty(window.URL, "revokeObjectURL", {
    value: vi.fn(),
    writable: true,
  });
}

// Mock fetch for TTS
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/mp3" })),
});

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();

  // Set up MockAudio as global Audio (must be a class/function constructor)
  globalThis.Audio = class MockAudioGlobal {
    src: string;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(src?: string) {
      this.src = src ?? "";
    }
    play = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn();
  } as unknown as typeof Audio;

  // Set up mock fetch for TTS
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.Audio = originalAudio;
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// StatusIndicator tests
// ---------------------------------------------------------------------------

describe("StatusIndicator", () => {
  it("renders with idle state", () => {
    render(<StatusIndicator state="idle" />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders with recording state", () => {
    render(<StatusIndicator state="recording" />);
    expect(screen.getByText("Recording...")).toBeInTheDocument();
  });

  it("renders with listening state", () => {
    render(<StatusIndicator state="listening" />);
    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("renders with thinking state", () => {
    render(<StatusIndicator state="thinking" />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("renders with error state", () => {
    render(<StatusIndicator state="error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders with loading-model state", () => {
    render(<StatusIndicator state="loading-model" />);
    expect(screen.getByText("Loading Whisper...")).toBeInTheDocument();
  });

  it("renders with transcribing state (mapped to processing)", () => {
    render(<StatusIndicator state="processing" />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("renders with tts-speaking state", () => {
    render(<StatusIndicator state="tts-speaking" />);
    expect(screen.getByText("Speaking...")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<StatusIndicator state="idle" className="custom-class" />);
    const container = screen.getByText("Ready").parentElement;
    expect(container).toHaveClass("custom-class");
  });

  it("shows pulsing dot for active states", () => {
    const { rerender } = render(<StatusIndicator state="recording" />);
    const dot = screen.getByLabelText("Recording...");
    expect(dot).toHaveClass("animate-pulse");

    rerender(<StatusIndicator state="idle" />);
    const idleDot = screen.getByLabelText("Ready");
    expect(idleDot).not.toHaveClass("animate-pulse");
  });

  it("shows pulsing dot for loading-model state", () => {
    render(<StatusIndicator state="loading-model" />);
    const dot = screen.getByLabelText("Loading Whisper...");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("shows pulsing dot for tts-speaking state", () => {
    render(<StatusIndicator state="tts-speaking" />);
    const dot = screen.getByLabelText("Speaking...");
    expect(dot).toHaveClass("animate-pulse");
  });
});

// ---------------------------------------------------------------------------
// VoiceButton tests
// ---------------------------------------------------------------------------

describe("VoiceButton", () => {
  let onStart: () => void;
  let onStop: () => Promise<string>;

  beforeEach(() => {
    onStart = vi.fn() as unknown as () => void;
    onStop = vi.fn().mockResolvedValue("test transcript") as unknown as () => Promise<string>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a mic button when idle", () => {
    render(<VoiceButton status="idle" onStart={onStart} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });

  it("shows stop icon when recording", () => {
    render(<VoiceButton status="recording" onStart={onStart} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument();
  });

  it("shows loading spinner when model is loading", () => {
    render(<VoiceButton status="loading-model" onStart={onStart} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "Loading Whisper model..." })).toBeInTheDocument();
  });

  it("shows loading spinner when transcribing", () => {
    render(<VoiceButton status="transcribing" onStart={onStart} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "Transcribing..." })).toBeInTheDocument();
  });

  it("calls onStart when clicked while idle", async () => {
    const user = userEvent.setup();
    render(<VoiceButton status="idle" onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    expect(onStart).toHaveBeenCalled();
  });

  it("calls onStop when clicked while recording", async () => {
    const user = userEvent.setup();
    render(<VoiceButton status="recording" onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("does not call onStart when loading model", async () => {
    const user = userEvent.setup();
    render(<VoiceButton status="loading-model" onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "Loading Whisper model..." }));
    expect(onStart).not.toHaveBeenCalled();
  });

  it("does not call onStart when transcribing", async () => {
    const user = userEvent.setup();
    render(<VoiceButton status="transcribing" onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "Transcribing..." }));
    expect(onStart).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useOverlayMode hook tests
// ---------------------------------------------------------------------------

describe("useOverlayMode", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("defaults to type mode", () => {
    const { result } = renderHook(() => useOverlayMode());
    expect(result.current.mode).toBe("type");
  });

  it("reads stored mode from localStorage", () => {
    localStorageMock.setItem("hermes-overlay-mode", "ptt");
    const { result } = renderHook(() => useOverlayMode());
    expect(result.current.mode).toBe("ptt");
  });

  it("persists mode to localStorage on change", () => {
    const { result } = renderHook(() => useOverlayMode());
    act(() => {
      result.current.setMode("vad");
    });
    expect(result.current.mode).toBe("vad");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "hermes-overlay-mode",
      "vad",
    );
  });

  it("cycles through all modes", () => {
    const { result } = renderHook(() => useOverlayMode());
    expect(result.current.mode).toBe("type");

    act(() => result.current.setMode("ptt"));
    expect(result.current.mode).toBe("ptt");

    act(() => result.current.setMode("vad"));
    expect(result.current.mode).toBe("vad");

    act(() => result.current.setMode("type"));
    expect(result.current.mode).toBe("type");
  });
});

// ---------------------------------------------------------------------------
// useOverlayWindow hook tests
// ---------------------------------------------------------------------------

describe("useOverlayWindow", () => {
  it("starts with isOpen false", () => {
    const { result } = renderHook(() => useOverlayWindow());
    expect(result.current.isOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CompactChat tests
// ---------------------------------------------------------------------------

describe("CompactChat", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the compact chat container", () => {
    render(<CompactChat />);
    expect(screen.getByTestId("compact-chat")).toBeInTheDocument();
  });

  it("renders the input field with placeholder", () => {
    render(<CompactChat />);
    expect(screen.getByTestId("compact-input")).toHaveAttribute(
      "placeholder",
      "Type a message…",
    );
  });

  it("renders the send button", () => {
    render(<CompactChat />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(<CompactChat />);
    expect(screen.getByRole("button", { name: "Close overlay" })).toBeInTheDocument();
  });

  it("renders mode toggle button", () => {
    render(<CompactChat />);
    expect(
      screen.getByRole("button", { name: /Switch mode/ }),
    ).toBeInTheDocument();
  });

  it("shows 'Ask anything…' when no messages", () => {
    render(<CompactChat />);
    expect(screen.getByText("Ask anything…")).toBeInTheDocument();
  });

  it("renders TTS mute/unmute button", () => {
    render(<CompactChat />);
    expect(screen.getByRole("button", { name: "Mute TTS" })).toBeInTheDocument();
  });

  it("cycles mode on toggle click", async () => {
    const user = userEvent.setup();
    render(<CompactChat />);
    const toggleBtn = screen.getByRole("button", { name: /Switch mode/ });

    // Default is Type
    expect(toggleBtn).toHaveTextContent("Type");

    // Click to cycle to PTT
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("PTT");

    // Click to cycle to VAD
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("VAD");

    // Click to cycle back to Type
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Type");
  });

  it("typing in input updates the text", async () => {
    const user = userEvent.setup();
    render(<CompactChat />);
    const input = screen.getByTestId("compact-input");
    await user.type(input, "Hello");
    expect(input).toHaveValue("Hello");
  });

  it("send button is disabled when input is empty", () => {
    render(<CompactChat />);
    const sendBtn = screen.getByRole("button", { name: "Send message" });
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when input has text", async () => {
    const user = userEvent.setup();
    render(<CompactChat />);
    const input = screen.getByTestId("compact-input");
    await user.type(input, "Hello");
    const sendBtn = screen.getByRole("button", { name: "Send message" });
    expect(sendBtn).not.toBeDisabled();
  });

  it("toggles mute state", async () => {
    const user = userEvent.setup();
    render(<CompactChat />);
    const muteBtn = screen.getByRole("button", { name: "Mute TTS" });
    await user.click(muteBtn);
    expect(screen.getByRole("button", { name: "Unmute TTS" })).toBeInTheDocument();
  });

  it("shows PTT mode VoiceButton when mode is PTT", async () => {
    const user = userEvent.setup();
    render(<CompactChat />);
    const toggleBtn = screen.getByRole("button", { name: /Switch mode/ });
    await user.click(toggleBtn); // Switch to PTT
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Whisper module tests (mocked)
// ---------------------------------------------------------------------------

describe("whisper module", () => {
  it("getTranscriber calls pipeline with correct args", async () => {
    const { getTranscriber } = await import("../features/minimalism/whisper");
    const { pipeline } = await import("@xenova/transformers");

    const transcriber = await getTranscriber();
    expect(pipeline).toHaveBeenCalledWith(
      "automatic-speech-recognition",
      "Xenova/whisper-base",
      expect.objectContaining({
        chunk_length_s: 30,
        stride_length_s: 5,
      }),
    );
    expect(transcriber).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TTS hook tests (mocked)
// ---------------------------------------------------------------------------

describe("useTTS hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("speak calls Resemble AI API", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");

    // Set up credentials in localStorage
    localStorageMock.setItem(
      "hermes-connection",
      JSON.stringify({ state: { gatewayUrl: "http://localhost:8080", apiKey: "test-key" } }),
    );

    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.speak("Hello world");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://engine.resemble.ai/v2/speech",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        body: JSON.stringify({
          voice_uuid: "61fcb769",
          data: "Hello world",
          output_format: "mp3",
          sample_rate: 44100,
        }),
      }),
    );
  });

  it("speak does nothing without API key", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");
    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.speak("Hello world");
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("stop cancels playback", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");

    localStorageMock.setItem(
      "hermes-connection",
      JSON.stringify({ state: { gatewayUrl: "http://localhost:8080", apiKey: "test-key" } }),
    );

    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.speak("Hello world");
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.status).toBe("idle");
  });

  it("isSupported returns true when API key exists", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");

    localStorageMock.setItem(
      "hermes-connection",
      JSON.stringify({ state: { gatewayUrl: "http://localhost:8080", apiKey: "test-key" } }),
    );

    const { result } = renderHook(() => useTTS());
    expect(result.current.isSupported()).toBe(true);
  });

  it("isSupported returns false without API key", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");

    const { result } = renderHook(() => useTTS());
    expect(result.current.isSupported()).toBe(false);
  });

  it("uses dedicated resemble-api-key when set", async () => {
    const { useTTS } = await import("../features/minimalism/use-tts");

    localStorageMock.setItem("resemble-api-key", "resemble-direct-key");

    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.speak("Test");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://engine.resemble.ai/v2/speech",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer resemble-direct-key",
        }),
      }),
    );
  });
});
