/**
 * ModelManager — utility constants and helpers for STT model management.
 */

export interface STTModelInfo {
  id: string;
  name: string;
  size: string;
  speed: string;
  quality: string;
}

export interface STTLanguageInfo {
  code: string;
  name: string;
}

export interface ResembleVoiceInfo {
  uuid: string;
  name: string;
}

export const STT_MODELS: STTModelInfo[] = [
  {
    id: "Xenova/whisper-tiny",
    name: "Tiny",
    size: "39 MB",
    speed: "Fastest",
    quality: "Basic",
  },
  {
    id: "Xenova/whisper-base",
    name: "Base",
    size: "144 MB",
    speed: "Fast",
    quality: "Good",
  },
  {
    id: "Xenova/whisper-small",
    name: "Small",
    size: "461 MB",
    speed: "Medium",
    quality: "Better",
  },
  {
    id: "Xenova/whisper-medium",
    name: "Medium",
    size: "1.4 GB",
    speed: "Slow",
    quality: "Great",
  },
  {
    id: "Xenova/whisper-large-v3",
    name: "Large v3",
    size: "2.9 GB",
    speed: "Slowest",
    quality: "Best",
  },
];

export const STT_LANGUAGES: STTLanguageInfo[] = [
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "auto", name: "Auto-detect" },
];

export const RESEMBLE_VOICES: ResembleVoiceInfo[] = [
  { uuid: "61fcb769", name: "Default" },
];

export function getModelInfo(modelId: string): STTModelInfo {
  return (
    STT_MODELS.find((m) => m.id === modelId) ?? STT_MODELS[1]
  );
}

export function getLanguageName(code: string): string {
  return (
    STT_LANGUAGES.find((l) => l.code === code)?.name ?? "English"
  );
}
