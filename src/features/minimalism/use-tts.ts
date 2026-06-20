import { useCallback, useRef, useState } from "react";
import { useSettings } from "./use-settings";

/**
 * TTS status type.
 */
export type TTSStatus = "idle" | "speaking" | "error";

/**
 * Hook for text-to-speech via Resemble AI.
 *
 * Reads voice UUID and speed from the overlay settings store.
 * Falls back to localStorage for API key (hermes-connection store).
 */
export function useTTS() {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const {
    resembleApiKey,
    resembleVoiceUuid,
    ttsSpeed,
  } = useSettings();

  /**
   * Read Resemble AI API key — prefer settings store, fall back to
   * localStorage hermes-connection store.
   */
  const getApiKey = useCallback((): string | null => {
    if (resembleApiKey) return resembleApiKey;

    const resembleKey = localStorage.getItem("resemble-api-key");
    if (resembleKey) return resembleKey;

    try {
      const stored = localStorage.getItem("hermes-connection");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.state?.apiKey ?? null;
    } catch {
      return null;
    }
  }, [resembleApiKey]);

  /**
   * Speak the given text using Resemble AI TTS.
   */
  const speak = useCallback(
    async (text: string) => {
      const apiKey = getApiKey();
      if (!apiKey || !text.trim()) return;

      // Stop any current playback
      stop();

      try {
        setStatus("speaking");

        const response = await fetch("https://engine.resemble.ai/v2/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_uuid: resembleVoiceUuid,
            data: text,
            output_format: "mp3",
            sample_rate: 44100,
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setStatus("idle");
          cleanup();
        };

        audio.onerror = () => {
          setStatus("error");
          cleanup();
        };

        await audio.play();
      } catch (err) {
        console.error("TTS error:", err);
        setStatus("error");
        // Auto-recover from error after a brief delay
        setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [getApiKey, resembleVoiceUuid, ttsSpeed],
  );

  /**
   * Stop current TTS playback.
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setStatus("idle");
    cleanup();
  }, []);

  /** Clean up object URLs. */
  function cleanup() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  /**
   * Whether TTS is supported (has API key configured).
   */
  const isSupported = useCallback((): boolean => {
    return getApiKey() !== null;
  }, [getApiKey]);

  return { speak, stop, status, isSupported };
}
