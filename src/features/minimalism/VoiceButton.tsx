import { useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { VoiceStatus } from "./use-voice-recorder";

interface VoiceButtonProps {
  /** Current voice status */
  status: VoiceStatus;
  /** Start recording */
  onStart: () => void;
  /** Stop recording — returns transcript */
  onStop: () => Promise<string>;
  /** Whether the button is active (PTT mode, holding space) */
  isActive?: boolean;
  className?: string;
}

/**
 * Voice button for PTT (push-to-talk) mode.
 * Visual feedback: pulsing red indicator while recording,
 * loading spinner while Whisper model downloads,
 * spinner while transcribing.
 * Supports both click and Space key hold.
 */
export function VoiceButton({
  status,
  onStart,
  onStop,
  isActive = false,
  className,
}: VoiceButtonProps) {
  const isRecording = status === "recording";
  const isLoadingModel = status === "loading-model";
  const isTranscribing = status === "transcribing";
  const isDisabled = isLoadingModel || isTranscribing;

  // Space key PTT: hold to record, release to stop
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only respond to Space when input is not focused
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === " " && !isInput && !isRecording && !isDisabled) {
        e.preventDefault();
        onStart();
      }
    },
    [isRecording, isDisabled, onStart],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === " " && isRecording) {
        e.preventDefault();
        onStop();
      }
    },
    [isRecording, onStop],
  );

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isActive, handleKeyDown, handleKeyUp]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      onStop();
    } else if (!isDisabled) {
      onStart();
    }
  }, [isRecording, isDisabled, onStart, onStop]);

  const ariaLabel = isLoadingModel
    ? "Loading Whisper model..."
    : isTranscribing
      ? "Transcribing..."
      : isRecording
        ? "Stop recording"
        : "Start recording";

  return (
    <button
      onClick={handleClick}
      title={ariaLabel}
      aria-label={ariaLabel}
      disabled={isDisabled}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        "transition-all duration-150",
        "active:scale-[0.92]",
        isRecording
          ? "bg-mac-red/80 text-white animate-pulse"
          : isLoadingModel
            ? "bg-yellow-400/80 text-white"
            : isTranscribing
              ? "bg-mac-accent/80 text-white animate-pulse"
              : "mac-icon-btn dark:text-mac-secondary-label light:text-gray-400",
        isDisabled && "opacity-70 cursor-not-allowed",
        className,
      )}
    >
      {isRecording ? (
        <MicOff className="h-3.5 w-3.5" />
      ) : isLoadingModel || isTranscribing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
