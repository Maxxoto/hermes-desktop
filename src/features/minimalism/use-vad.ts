import { useCallback, useRef, useState } from "react";
import { getTranscriber } from "./whisper";

/**
 * VAD status type.
 */
export type VADStatus = "idle" | "listening" | "speaking" | "processing";

/**
 * Hook for Voice Activity Detection using @ricky0123/vad-web.
 * Continuously listens for speech, starts recording on speech detection,
 * and transcribes using local Whisper on silence.
 */
export function useVAD(options?: {
  onSpeechEnd?: (transcript: string) => void;
  silenceThresholdMs?: number;
}) {
  const [status, setStatus] = useState<VADStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const vadRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceThresholdMs = options?.silenceThresholdMs ?? 500;

  /**
   * Start VAD listening.
   */
  const start = useCallback(async () => {
    try {
      const { MicVAD } = await import("@ricky0123/vad-web");

      // Pre-load Whisper model while VAD initializes
      getTranscriber().catch(() => {});

      const vad = await MicVAD.new({
        onSpeechStart: () => {
          setStatus("speaking");
          setTranscript("");
          chunksRef.current = [];

          // Start media recording for this speech segment
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              streamRef.current = stream;
              const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : "audio/wav";
              const recorder = new MediaRecorder(stream, { mimeType });
              recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                  chunksRef.current.push(event.data);
                }
              };
              recorder.onstop = () => {};
              recorder.start();
              mediaRecorderRef.current = recorder;
            })
            .catch(() => {
              // Could not get microphone
            });
        },
        onSpeechEnd: async () => {
          setStatus("processing");

          // Stop media recorder
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
          }

          // Stop media stream tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          // Transcribe with Whisper
          let finalText = "";
          if (chunksRef.current.length > 0) {
            try {
              const audioBlob = new Blob(chunksRef.current, {
                type: chunksRef.current[0]?.type ?? "audio/webm",
              });
              const { transcribeBlob } = await import("./whisper");
              finalText = await transcribeBlob(audioBlob);
              setTranscript(finalText);
            } catch {
              finalText = "";
            }
            chunksRef.current = [];
          }

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            setStatus("listening");
            options?.onSpeechEnd?.(finalText);
          }, silenceThresholdMs);
        },
      });

      vadRef.current = vad;
      await vad.start();
      setStatus("listening");
    } catch {
      setStatus("idle");
    }
  }, [silenceThresholdMs, options]);

  /**
   * Stop VAD listening and clean up.
   */
  const stop = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop media recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop VAD
    try {
      const vad = vadRef.current as { destroy?: () => void } | null;
      vad?.destroy?.();
    } catch {
      // ignore
    }
    vadRef.current = null;
    chunksRef.current = [];
    setTranscript("");
    setStatus("idle");
  }, []);

  return {
    status,
    transcript,
    start,
    stop,
  };
}
