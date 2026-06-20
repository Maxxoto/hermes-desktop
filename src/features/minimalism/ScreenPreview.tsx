import { useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface ScreenPreviewProps {
  stream: MediaStream;
  onCapture: () => void;
}

/**
 * Compact live preview of the shared screen.
 * Click to capture a screenshot. Shows a pulsing red dot + "Live" label.
 */
export function ScreenPreview({ stream, onCapture }: ScreenPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        // Autoplay may be blocked; ignore silently
      });
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer",
        "border border-[rgba(255,255,255,0.18)]",
        "hover:border-[#0A84FF] transition-colors",
        "group",
      )}
      onClick={onCapture}
      role="button"
      aria-label="Click to capture screenshot"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCapture();
        }
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-24 object-cover"
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-1 left-1 flex items-center gap-1 pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] text-white/70">Live • Click to capture</span>
      </div>
    </div>
  );
}
