import { useCallback, useRef, useState } from "react";
import { getTranscriber, type WhisperLoadStatus } from "./whisper";
import { useSettings } from "./use-settings";

/**
 * Voice recorder status type.
 * "loading-model" = Whisper model downloading (first time only, ~150MB)
 */
export type VoiceStatus =
  | "idle"
  | "loading-model"
  | "recording"
  | "transcribing"
  | "error";

/**
 * Hook for audio recording + local Whisper transcription.
 * Provides PTT (push-to-talk) functionality.
 *
 * Replaces the old Web Speech API implementation with local Whisper
 * via @xenova/transformers for privacy and offline capability.
 */
export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [whisperStatus, setWhisperStatus] = useState<WhisperLoadStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { sttModel } = useSettings();

  /**
   * Ensure the Whisper model is loaded. Shows loading-model status while
   * the model downloads (first time only, ~150MB). Cached in IndexedDB.
   */
  const ensureModel = useCallback(async (): Promise<boolean> => {
    if (whisperStatus === "ready") return true;

    setWhisperStatus("loading");
    setStatus("loading-model");
    try {
      await getTranscriber(sttModel);
      setWhisperStatus("ready");
      setStatus("idle");
      return true;
    } catch {
      setWhisperStatus("error");
      setStatus("error");
      return false;
    }
  }, [whisperStatus, sttModel]);

  /**
   * Start recording audio from the microphone.
   * Also starts loading the Whisper model if not already cached.
   */
  const startRecording = useCallback(async () => {
    try {
      // Ensure Whisper model is loaded first
      const ready = await ensureModel();
      if (!ready) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setStatus("recording");
      setTranscript("");

      // Set up MediaRecorder for audio capture
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
    } catch {
      setStatus("error");
    }
  }, [ensureModel]);

  /**
   * Stop recording and transcribe the captured audio using Whisper.
   */
  const stopRecording = useCallback(async (): Promise<string> => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // If no audio was captured, return empty
    if (chunksRef.current.length === 0) {
      setStatus("idle");
      return "";
    }

    // Transcribe with Whisper
    setStatus("transcribing");
    try {
      const audioBlob = new Blob(chunksRef.current, {
        type: chunksRef.current[0]?.type ?? "audio/webm",
      });
      const { transcribeBlob } = await import("./whisper");
      const text = await transcribeBlob(audioBlob);
      setTranscript(text);
      setStatus("idle");
      chunksRef.current = [];
      return text;
    } catch {
      setStatus("error");
      chunksRef.current = [];
      return "";
    }
  }, []);

  /**
   * Cancel recording without returning transcript.
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
    setTranscript("");
    setStatus("idle");
  }, []);

  /**
   * Check if audio recording is supported (always true in modern browsers).
   */
  const isSupported = useCallback(() => {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    );
  }, []);

  /**
   * Pre-load the Whisper model (call on mount for better UX).
   */
  const preloadModel = useCallback(() => {
    if (whisperStatus === "idle") {
      ensureModel();
    }
  }, [whisperStatus, ensureModel]);

  return {
    status,
    transcript,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
    preloadModel,
    whisperStatus,
  };
}
