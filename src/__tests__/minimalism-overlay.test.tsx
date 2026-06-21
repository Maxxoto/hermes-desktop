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
import SettingsPage from "../features/minimalism/SettingsPage";
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
    expect(toggleBtn).toHaveTextContent("Talk");

    // Click to cycle to VAD
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Listen");

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

// ---------------------------------------------------------------------------
// Settings page tests
// ---------------------------------------------------------------------------

describe("SettingsPage", () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset zustand store to defaults between tests
    const { useSettings } = await import("../features/minimalism/use-settings");
    useSettings.setState({
      sttModel: "Xenova/whisper-base",
      sttLanguage: "en",
      sttAutoLoad: false,
      downloadedModels: [],
      ttsProvider: "resemble",
      resembleApiKey: "",
      resembleVoiceUuid: "61fcb769",
      ttsSpeed: 1.0,
      ttsAutoSpeak: true,
      vadSensitivity: 50,
      vadSilenceThreshold: 500,
      overlayShortcut: "Cmd+Shift+Space",
      overlayAlwaysOnTop: true,
      overlayAutoHide: false,
      overlayOpacity: 100,
      defaultMode: "type",
      theme: "dark",
    });
  });

  it("renders settings page", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
  });

  it("renders back button", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByRole("button", { name: "Back to chat" })).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: "Back to chat" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders all four section cards", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByTestId("section-speech-to-text")).toBeInTheDocument();
    expect(screen.getByTestId("section-text-to-speech")).toBeInTheDocument();
    expect(screen.getByTestId("section-voice-activity-detection")).toBeInTheDocument();
    expect(screen.getByTestId("section-overlay")).toBeInTheDocument();
  });

  it("renders STT model selector with default value", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("Xenova/whisper-base");
  });

  it("renders STT language selector with default value", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[1]).toHaveValue("en");
  });

  it("renders test recording button", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByRole("button", { name: "Test Recording" })).toBeInTheDocument();
  });

  it("renders auto-load model toggle", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const toggle = screen.getByRole("switch", { name: "Auto-load model on startup" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders TTS provider selector", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    const ttsSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === "resemble",
    );
    expect(ttsSelect).toBeDefined();
  });

  it("renders API key input", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByLabelText("Resemble AI API key")).toBeInTheDocument();
  });

  it("renders preview button", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByRole("button", { name: "Preview TTS voice" })).toBeInTheDocument();
  });

  it("toggles API key visibility", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const toggleBtn = screen.getByRole("button", { name: "Show API key" });
    await user.click(toggleBtn);
    expect(screen.getByRole("button", { name: "Hide API key" })).toBeInTheDocument();
  });

  it("renders VAD sensitivity slider", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(3);
  });

  it("renders silence threshold selector with 500ms default", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    const thresholdSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === "500",
    );
    expect(thresholdSelect).toBeDefined();
  });

  it("renders overlay shortcut input", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByLabelText("Global keyboard shortcut")).toBeInTheDocument();
  });

  it("renders always on top toggle defaulting to true", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const alwaysOnTop = screen.getByRole("switch", { name: "Always on top" });
    expect(alwaysOnTop).toHaveAttribute("aria-checked", "true");
  });

  it("renders auto-hide toggle defaulting to false", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const autoHide = screen.getByRole("switch", { name: "Auto-hide after response" });
    expect(autoHide).toHaveAttribute("aria-checked", "false");
  });

  it("renders theme selector with dark default", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    const themeSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === "dark",
    );
    expect(themeSelect).toBeDefined();
  });

  it("renders default mode selector with type default", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    const modeSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === "type",
    );
    expect(modeSelect).toBeDefined();
  });

  it("toggles auto-load model on click", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const toggle = screen.getByRole("switch", { name: "Auto-load model on startup" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("toggles auto-speak on click", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const toggle = screen.getByRole("switch", { name: "Auto-speak responses" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("changes STT model via selector", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const select = screen.getAllByRole("combobox")[0];
    await user.selectOptions(select, "Xenova/whisper-small");
    expect(select).toHaveValue("Xenova/whisper-small");
  });

  it("changes language via selector", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    const selects = screen.getAllByRole("combobox");
    const langSelect = selects[1];
    await user.selectOptions(langSelect, "zh");
    expect(langSelect).toHaveValue("zh");
  });

  it("shows model size and speed info for default model", () => {
    const onBack = vi.fn();
    render(<SettingsPage onBack={onBack} />);
    expect(screen.getByText("144 MB")).toBeInTheDocument();
    expect(screen.getByText("Speed: Fast")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// useSettings hook tests
// ---------------------------------------------------------------------------

describe("useSettings store", () => {
  beforeEach(async () => {
    localStorageMock.clear();
    // Reset zustand store to defaults between tests
    const { useSettings } = await import("../features/minimalism/use-settings");
    useSettings.setState({
      sttModel: "Xenova/whisper-base",
      sttLanguage: "en",
      sttAutoLoad: false,
      downloadedModels: [],
      ttsProvider: "resemble",
      resembleApiKey: "",
      resembleVoiceUuid: "61fcb769",
      ttsSpeed: 1.0,
      ttsAutoSpeak: true,
      vadSensitivity: 50,
      vadSilenceThreshold: 500,
      overlayShortcut: "Cmd+Shift+Space",
      overlayAlwaysOnTop: true,
      overlayAutoHide: false,
      overlayOpacity: 100,
      defaultMode: "type",
      theme: "dark",
    });
  });

  it("has correct defaults", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    expect(result.current.sttModel).toBe("Xenova/whisper-base");
    expect(result.current.sttLanguage).toBe("en");
    expect(result.current.sttAutoLoad).toBe(false);
    expect(result.current.ttsProvider).toBe("resemble");
    expect(result.current.resembleVoiceUuid).toBe("61fcb769");
    expect(result.current.ttsSpeed).toBe(1.0);
    expect(result.current.ttsAutoSpeak).toBe(true);
    expect(result.current.vadSensitivity).toBe(50);
    expect(result.current.vadSilenceThreshold).toBe(500);
    expect(result.current.overlayAlwaysOnTop).toBe(true);
    expect(result.current.overlayOpacity).toBe(100);
    expect(result.current.defaultMode).toBe("type");
    expect(result.current.theme).toBe("dark");
  });

  it("setSTTModel updates the model", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setSTTModel("Xenova/whisper-small");
    });
    expect(result.current.sttModel).toBe("Xenova/whisper-small");
  });

  it("setSTTLanguage updates the language", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setSTTLanguage("ja");
    });
    expect(result.current.sttLanguage).toBe("ja");
  });

  it("setSTTAutoLoad updates auto-load flag", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setSTTAutoLoad(true);
    });
    expect(result.current.sttAutoLoad).toBe(true);
  });

  it("addDownloadedModel adds model to list", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.addDownloadedModel("Xenova/whisper-base");
    });
    expect(result.current.downloadedModels).toContain("Xenova/whisper-base");
  });

  it("addDownloadedModel deduplicates entries", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.addDownloadedModel("Xenova/whisper-base");
      result.current.addDownloadedModel("Xenova/whisper-base");
    });
    expect(
      result.current.downloadedModels.filter((m) => m === "Xenova/whisper-base"),
    ).toHaveLength(1);
  });

  it("setTTSProvider updates provider", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setTTSProvider("local");
    });
    expect(result.current.ttsProvider).toBe("local");
  });

  it("setResembleApiKey updates API key", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setResembleApiKey("test-key-123");
    });
    expect(result.current.resembleApiKey).toBe("test-key-123");
  });

  it("setResembleVoice updates voice UUID", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setResembleVoice("custom-uuid");
    });
    expect(result.current.resembleVoiceUuid).toBe("custom-uuid");
  });

  it("setTTSSpeed updates speed", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setTTSSpeed(1.5);
    });
    expect(result.current.ttsSpeed).toBe(1.5);
  });

  it("setTTSAutoSpeak updates auto-speak", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setTTSAutoSpeak(false);
    });
    expect(result.current.ttsAutoSpeak).toBe(false);
  });

  it("setVADSensitivity updates sensitivity", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setVADSensitivity(80);
    });
    expect(result.current.vadSensitivity).toBe(80);
  });

  it("setVADSilenceThreshold updates threshold", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setVADSilenceThreshold(1000);
    });
    expect(result.current.vadSilenceThreshold).toBe(1000);
  });

  it("setOverlayAlwaysOnTop updates setting", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setOverlayAlwaysOnTop(false);
    });
    expect(result.current.overlayAlwaysOnTop).toBe(false);
  });

  it("setOverlayAutoHide updates setting", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setOverlayAutoHide(true);
    });
    expect(result.current.overlayAutoHide).toBe(true);
  });

  it("setOverlayOpacity updates opacity", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setOverlayOpacity(75);
    });
    expect(result.current.overlayOpacity).toBe(75);
  });

  it("setDefaultMode updates mode", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setDefaultMode("vad");
    });
    expect(result.current.defaultMode).toBe("vad");
  });

  it("setTheme updates theme", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");
  });

  it("setOverlayShortcut updates shortcut", async () => {
    const { useSettings } = await import("../features/minimalism/use-settings");
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.setOverlayShortcut("Ctrl+Shift+Space");
    });
    expect(result.current.overlayShortcut).toBe("Ctrl+Shift+Space");
  });
});

// ---------------------------------------------------------------------------
// ModelManager tests
// ---------------------------------------------------------------------------

describe("ModelManager", () => {
  it("getModelInfo returns correct model for known id", async () => {
    const { getModelInfo } = await import("../features/minimalism/ModelManager");
    const info = getModelInfo("Xenova/whisper-base");
    expect(info.name).toBe("Base");
    expect(info.size).toBe("144 MB");
    expect(info.speed).toBe("Fast");
    expect(info.quality).toBe("Good");
  });

  it("getModelInfo defaults to base model for unknown id", async () => {
    const { getModelInfo } = await import("../features/minimalism/ModelManager");
    const info = getModelInfo("unknown-model");
    expect(info.id).toBe("Xenova/whisper-base");
  });

  it("getLanguageName returns correct name", async () => {
    const { getLanguageName } = await import("../features/minimalism/ModelManager");
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("zh")).toBe("Chinese");
    expect(getLanguageName("ja")).toBe("Japanese");
  });

  it("getLanguageName defaults to English for unknown code", async () => {
    const { getLanguageName } = await import("../features/minimalism/ModelManager");
    expect(getLanguageName("unknown")).toBe("English");
  });

  it("STT_MODELS has all 5 models", async () => {
    const { STT_MODELS } = await import("../features/minimalism/ModelManager");
    expect(STT_MODELS).toHaveLength(5);
  });

  it("STT_LANGUAGES has all 10 languages", async () => {
    const { STT_LANGUAGES } = await import("../features/minimalism/ModelManager");
    expect(STT_LANGUAGES).toHaveLength(10);
  });

  it("RESEMBLE_VOICES has default voice", async () => {
    const { RESEMBLE_VOICES } = await import("../features/minimalism/ModelManager");
    expect(RESEMBLE_VOICES).toHaveLength(1);
    expect(RESEMBLE_VOICES[0].uuid).toBe("61fcb769");
  });
});
