/**
 * whisper.ts — Shared Whisper ASR pipeline for local speech-to-text.
 *
 * Uses @xenova/transformers to run Whisper locally in the browser.
 * Model is downloaded on first use (~150MB for whisper-base) and cached
 * in browser IndexedDB via ONNX runtime.
 */

import {
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@xenova/transformers";

let cachedPipeline: AutomaticSpeechRecognitionPipeline | null = null;
let loadingPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/**
 * Whisper pipeline status for UI feedback.
 */
export type WhisperLoadStatus = "idle" | "loading" | "ready" | "error";

/**
 * Get (or lazily create) the Whisper ASR pipeline.
 * Caches after first load. Returns null on error.
 */
export async function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline | null> {
  if (cachedPipeline) return cachedPipeline;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const pipe = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-base",
        {
          chunk_length_s: 30,
          stride_length_s: 5,
        } as Parameters<typeof pipeline>[2],
      );
      cachedPipeline = pipe;
      return pipe;
    } catch (err) {
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

/**
 * Convert a Blob (e.g. audio/webm from MediaRecorder) to Float32Array
 * using the Web Audio API decoder.
 */
export async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    // Downmix to mono if stereo
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    const mono = new Float32Array(audioBuffer.length);
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    for (let i = 0; i < mono.length; i++) {
      mono[i] = (ch0[i] + ch1[i]) / 2;
    }
    return mono;
  } finally {
    await audioContext.close();
  }
}

/**
 * Transcribe audio from a Blob using Whisper.
 * Returns the transcribed text.
 */
export async function transcribeBlob(blob: Blob): Promise<string> {
  const transcriber = await getTranscriber();
  if (!transcriber) throw new Error("Whisper model failed to load");

  const audioData = await blobToFloat32(blob);
  const result = await transcriber(audioData, {
    language: "english",
    task: "transcribe",
  });
  if (Array.isArray(result)) {
    return result.map((r) => r.text).join(" ");
  }
  return result.text ?? "";
}
