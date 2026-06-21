import { useState, useRef, useCallback } from "react";

export interface ScreenShareState {
  isSharing: boolean;
  stream: MediaStream | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  captureScreenshot: () => string | null;
}

/**
 * Hook for screen sharing via getDisplayMedia().
 * Manages the MediaStream lifecycle and screenshot capture via canvas.
 */
export function useScreenShare(): ScreenShareState {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopSharing = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    setIsSharing(false);
  }, []);

  const startSharing = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          cursor: "never",
        } as MediaTrackConstraints,
        audio: false,
      });

      streamRef.current = mediaStream;

      // Create off-screen video element for preview + capture
      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      // Handle stream end (user clicks "Stop sharing" in browser UI)
      mediaStream.getVideoTracks()[0].addEventListener("ended", () => {
        stopSharing();
      });

      setIsSharing(true);
    } catch (err) {
      // User cancelled the picker or API error
      console.error("Screen share failed:", err);
      setIsSharing(false);
    }
  }, [stopSharing]);

  const captureScreenshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
  }, []);

  return {
    isSharing,
    stream: streamRef.current,
    startSharing,
    stopSharing,
    captureScreenshot,
  };
}
