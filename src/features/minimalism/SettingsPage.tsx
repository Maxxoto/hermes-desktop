import { useCallback, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Mic,
  Play,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useSettings } from "./use-settings";
import {
  STT_MODELS,
  STT_LANGUAGES,
  RESEMBLE_VOICES,
  getModelInfo,
} from "./ModelManager";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** macOS-style toggle switch */
function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] dark:text-mac-label light:text-black">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200",
          enabled ? "bg-[#34C759]" : "bg-[#636366]",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            enabled ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}

/** Glass-styled select dropdown */
function GlassSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none glass-input px-3 py-2 pr-8 text-[13px]",
          "dark:text-mac-label light:text-black",
          "focus:outline-none",
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 dark:text-mac-tertiary-label light:text-gray-400 pointer-events-none" />
    </div>
  );
}

/** Custom range slider with glow effect */
function GlassSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  displayValue,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  displayValue: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] dark:text-mac-label light:text-black">
          {label}
        </span>
        <span className="text-[12px] dark:text-mac-secondary-label light:text-gray-500">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-[#3A3A3C] rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0A84FF]
                   [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(10,132,255,0.4)]
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

/** Section card wrapper */
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-surface rounded-xl p-4" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px]">{icon}</span>
        <h2 className="text-[14px] font-semibold dark:text-mac-label light:text-black">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SettingsPage
// ---------------------------------------------------------------------------

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const settings = useSettings();

  // Local state for test recording
  const [testStatus, setTestStatus] = useState<
    "idle" | "recording" | "transcribing" | "result"
  >("idle");
  const [testTranscript, setTestTranscript] = useState("");

  // Local state for TTS preview
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Local state for API key visibility
  const [showApiKey, setShowApiKey] = useState(false);

  // ---------------------------------------------------------------------------
  // Test Recording
  // ---------------------------------------------------------------------------
  const handleTestRecording = useCallback(async () => {
    setTestStatus("recording");
    setTestTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/wav";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      // Record for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());

      setTestStatus("transcribing");

      // Transcribe
      const { transcribeBlob } = await import("./whisper");
      const blob = new Blob(chunks, { type: mimeType });
      const text = await transcribeBlob(blob);
      setTestTranscript(text);
      setTestStatus("result");
    } catch {
      setTestTranscript("Error: could not record audio");
      setTestStatus("result");
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TTS Preview
  // ---------------------------------------------------------------------------
  const handleTTSPreview = useCallback(async () => {
    const apiKey =
      settings.resembleApiKey || localStorage.getItem("resemble-api-key");
    if (!apiKey) {
      setTestTranscript("No API key configured");
      return;
    }

    setPreviewPlaying(true);
    try {
      const response = await fetch(
        "https://engine.resemble.ai/v2/speech",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_uuid: settings.resembleVoiceUuid,
            data: "Hello, I'm your AI assistant.",
            output_format: "mp3",
            sample_rate: 44100,
          }),
        },
      );

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewPlaying(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewPlaying(false);
      };
      await audio.play();
    } catch {
      setPreviewPlaying(false);
    }
  }, [settings.resembleApiKey, settings.resembleVoiceUuid]);

  // ---------------------------------------------------------------------------
  // Model info for current selection
  // ---------------------------------------------------------------------------
  const currentModel = getModelInfo(settings.sttModel);

  return (
    <div
      className="glass-surface rounded-xl overflow-hidden flex flex-col"
      style={{
        width: "400px",
        height: "300px",
        maxWidth: "90vw",
        maxHeight: "80vh",
        animation: "cmdk-scale 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      data-testid="settings-page"
    >
      {/* Header */}
      <div
        className="flex items-center px-3 py-2"
        style={{
          background: "var(--mac-toolbar)",
          borderBottom: "1px solid var(--mac-separator)",
        }}
        data-tauri-drag-region
      >
        <button
          onClick={onBack}
          title="Back to chat"
          aria-label="Back to chat"
          className="mac-icon-btn !w-6 !h-6 mr-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <Settings className="h-3.5 w-3.5 dark:text-mac-secondary-label light:text-gray-400 mr-1.5" />
        <span className="text-[13px] font-medium dark:text-mac-label light:text-black">
          Settings
        </span>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ minHeight: 0 }}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Section 1: Speech-to-Text                                         */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard icon="🎤" title="Speech-to-Text">
          {/* Model selector */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Model
            </label>
            <GlassSelect
              value={settings.sttModel}
              onChange={settings.setSTTModel}
              options={STT_MODELS.map((m) => ({
                value: m.id,
                label: `whisper-${m.name}`,
              }))}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
                {currentModel.size}
              </span>
              <span className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
                ·
              </span>
              <span className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
                Speed: {currentModel.speed}
              </span>
              <span className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
                ·
              </span>
              <span className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
                {currentModel.quality}
              </span>
            </div>
          </div>

          {/* Downloaded status */}
          <div className="glass-input rounded-lg px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] dark:text-mac-green light:text-green-600">
                {settings.downloadedModels.includes(settings.sttModel)
                  ? "✅ Downloaded"
                  : "📥 Not downloaded"}
              </span>
            </div>
          </div>

          {/* Language selector */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Language
            </label>
            <GlassSelect
              value={settings.sttLanguage}
              onChange={settings.setSTTLanguage}
              options={STT_LANGUAGES.map((l) => ({
                value: l.code,
                label: l.name,
              }))}
            />
          </div>

          {/* Test recording */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleTestRecording}
              disabled={testStatus === "recording" || testStatus === "transcribing"}
              className={cn(
                "mac-btn text-[11px] !h-7 flex items-center gap-1.5",
                testStatus === "recording" &&
                  "!bg-mac-red/80 !text-white !border-mac-red",
                testStatus === "transcribing" &&
                  "!bg-mac-accent/80 !text-white !border-mac-accent",
              )}
              aria-label={
                testStatus === "recording"
                  ? "Recording..."
                  : testStatus === "transcribing"
                    ? "Transcribing..."
                    : "Test Recording"
              }
            >
              <Mic className="h-3 w-3" />
              {testStatus === "recording"
                ? "Recording..."
                : testStatus === "transcribing"
                  ? "Transcribing..."
                  : "Test Recording"}
            </button>
            {testStatus === "result" && testTranscript && (
              <span className="text-[11px] dark:text-mac-secondary-label light:text-gray-500 truncate max-w-[200px]">
                &ldquo;{testTranscript}&rdquo;
              </span>
            )}
          </div>

          {/* Auto-load toggle */}
          <Toggle
            enabled={settings.sttAutoLoad}
            onToggle={() => settings.setSTTAutoLoad(!settings.sttAutoLoad)}
            label="Auto-load model on startup"
          />
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* Section 2: Text-to-Speech                                         */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard icon="🔊" title="Text-to-Speech">
          {/* Provider */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Provider
            </label>
            <GlassSelect
              value={settings.ttsProvider}
              onChange={(val) =>
                settings.setTTSProvider(val as "resemble" | "local")
              }
              options={[
                { value: "resemble", label: "Resemble AI" },
                { value: "local", label: "Local (future)" },
              ]}
            />
          </div>

          {/* API Key */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.resembleApiKey}
                onChange={(e) => settings.setResembleApiKey(e.target.value)}
                placeholder="Enter Resemble AI key…"
                className={cn(
                  "flex-1 glass-input px-3 py-2 text-[13px]",
                  "dark:text-mac-label dark:placeholder:text-mac-tertiary-label",
                  "light:text-black light:placeholder:text-gray-400",
                  "focus:outline-none",
                )}
                aria-label="Resemble AI API key"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="mac-btn text-[11px] !h-7"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Voice */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Voice
            </label>
            <GlassSelect
              value={settings.resembleVoiceUuid}
              onChange={settings.setResembleVoice}
              options={RESEMBLE_VOICES.map((v) => ({
                value: v.uuid,
                label: `${v.name} (${v.uuid})`,
              }))}
            />
          </div>

          {/* Preview button */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleTTSPreview}
              disabled={previewPlaying}
              className={cn(
                "mac-btn text-[11px] !h-7 flex items-center gap-1.5",
                previewPlaying && "!bg-mac-accent/80 !text-white",
              )}
              aria-label="Preview TTS voice"
            >
              <Play className="h-3 w-3" />
              {previewPlaying ? "Playing..." : "Preview"}
            </button>
            {previewPlaying && (
              <span className="text-[11px] dark:text-mac-secondary-label light:text-gray-500">
                &ldquo;Hello, I&apos;m your AI assistant.&rdquo;
              </span>
            )}
          </div>

          {/* Speed slider */}
          <GlassSlider
            value={settings.ttsSpeed}
            onChange={settings.setTTSSpeed}
            min={0.5}
            max={2.0}
            step={0.1}
            label="Speed"
            displayValue={`${settings.ttsSpeed.toFixed(1)}x`}
          />

          {/* Auto-speak toggle */}
          <Toggle
            enabled={settings.ttsAutoSpeak}
            onToggle={() => settings.setTTSAutoSpeak(!settings.ttsAutoSpeak)}
            label="Auto-speak responses"
          />
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* Section 3: Voice Activity Detection                               */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard icon="🎙️" title="Voice Activity Detection">
          {/* Sensitivity slider */}
          <GlassSlider
            value={settings.vadSensitivity}
            onChange={settings.setVADSensitivity}
            min={0}
            max={100}
            step={5}
            label="Sensitivity"
            displayValue={
              settings.vadSensitivity < 33
                ? "Low"
                : settings.vadSensitivity < 66
                  ? "Medium"
                  : "High"
            }
          />

          {/* Silence threshold */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Silence threshold
            </label>
            <GlassSelect
              value={String(settings.vadSilenceThreshold)}
              onChange={(val) =>
                settings.setVADSilenceThreshold(Number(val))
              }
              options={[
                { value: "300", label: "300ms" },
                { value: "500", label: "500ms" },
                { value: "750", label: "750ms" },
                { value: "1000", label: "1000ms" },
                { value: "1500", label: "1500ms" },
              ]}
            />
            <span className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 mt-0.5 block">
              How long to wait after speech stops
            </span>
          </div>

          {/* Model info */}
          <div className="glass-input rounded-lg px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] dark:text-mac-secondary-label light:text-gray-500">
                Model: silero-v5 (default)
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* Section 4: Overlay Preferences                                    */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard icon="🖥️" title="Overlay">
          {/* Global shortcut */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Global shortcut
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.overlayShortcut}
                onChange={(e) => settings.setOverlayShortcut(e.target.value)}
                className={cn(
                  "flex-1 glass-input px-3 py-2 text-[13px]",
                  "dark:text-mac-label",
                  "light:text-black",
                  "focus:outline-none",
                )}
                aria-label="Global keyboard shortcut"
              />
              <button className="mac-btn text-[11px] !h-7">
                Record
              </button>
            </div>
          </div>

          {/* Always on top */}
          <Toggle
            enabled={settings.overlayAlwaysOnTop}
            onToggle={() =>
              settings.setOverlayAlwaysOnTop(!settings.overlayAlwaysOnTop)
            }
            label="Always on top"
          />

          {/* Auto-hide */}
          <Toggle
            enabled={settings.overlayAutoHide}
            onToggle={() =>
              settings.setOverlayAutoHide(!settings.overlayAutoHide)
            }
            label="Auto-hide after response"
          />

          {/* Window opacity */}
          <GlassSlider
            value={settings.overlayOpacity}
            onChange={settings.setOverlayOpacity}
            min={20}
            max={100}
            step={5}
            label="Window opacity"
            displayValue={`${settings.overlayOpacity}%`}
          />

          {/* Default mode */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Default mode
            </label>
            <GlassSelect
              value={settings.defaultMode}
              onChange={(val) =>
                settings.setDefaultMode(val as "type" | "ptt" | "vad")
              }
              options={[
                { value: "type", label: "Type" },
                { value: "ptt", label: "Push-to-Talk" },
                { value: "vad", label: "Voice Activity Detection" },
              ]}
            />
          </div>

          {/* Theme */}
          <div className="mb-2">
            <label className="block text-[11px] dark:text-mac-secondary-label light:text-gray-500 mb-1 uppercase tracking-wide">
              Theme
            </label>
            <GlassSelect
              value={settings.theme}
              onChange={(val) =>
                settings.setTheme(val as "dark" | "light" | "system")
              }
              options={[
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
                { value: "system", label: "System" },
              ]}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
