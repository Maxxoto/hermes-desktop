import { cn } from "../../lib/utils";

export type IndicatorState =
  | "idle"
  | "listening"
  | "speaking"
  | "recording"
  | "processing"
  | "thinking"
  | "error"
  | "loading-model"
  | "transcribing"
  | "tts-speaking"
  | "screen-sharing"
  | "capturing";

interface StatusIndicatorProps {
  state: IndicatorState;
  className?: string;
}

/**
 * Visual feedback indicator for the overlay.
 * Shows colored pulsing dots and status text.
 */
export function StatusIndicator({ state, className }: StatusIndicatorProps) {
  const stateConfig: Record<
    IndicatorState,
    { color: string; pulse: boolean; label: string }
  > = {
    idle: { color: "bg-mac-gray", pulse: false, label: "Ready" },
    listening: { color: "bg-mac-green", pulse: true, label: "Listening..." },
    speaking: { color: "bg-mac-green", pulse: true, label: "Speaking..." },
    recording: { color: "bg-mac-red", pulse: true, label: "Recording..." },
    processing: { color: "bg-mac-orange", pulse: true, label: "Processing..." },
    thinking: { color: "bg-mac-accent", pulse: true, label: "Thinking..." },
    error: { color: "bg-mac-red", pulse: false, label: "Error" },
    "loading-model": {
      color: "bg-yellow-400",
      pulse: true,
      label: "Loading Whisper...",
    },
    transcribing: {
      color: "bg-mac-accent",
      pulse: true,
      label: "Transcribing...",
    },
    "tts-speaking": {
      color: "bg-purple-500",
      pulse: true,
      label: "Speaking...",
    },
    "screen-sharing": {
      color: "bg-mac-accent",
      pulse: true,
      label: "Screen shared",
    },
    capturing: {
      color: "bg-purple-500",
      pulse: true,
      label: "Capturing...",
    },
  };

  // Map VAD + PTT statuses to indicator states
  const resolvedState = stateConfig[state] ? state : "idle";
  const config = stateConfig[resolvedState as IndicatorState] ?? stateConfig.idle;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block w-2 h-2 rounded-full",
          config.color,
          config.pulse && "animate-pulse",
        )}
        aria-label={config.label}
      />
      <span className="text-[11px] dark:text-mac-secondary-label light:text-gray-400">
        {config.label}
      </span>
    </div>
  );
}
