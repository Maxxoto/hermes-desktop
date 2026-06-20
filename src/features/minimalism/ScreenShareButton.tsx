import { Monitor, MonitorOff, Camera } from "lucide-react";
import { cn } from "../../lib/utils";
import { useScreenShare } from "./use-screen-share";

interface ScreenShareButtonProps {
  /** Called when a screenshot is captured — receives base64 PNG data */
  onCapture: (screenshot: string) => void;
  /** Optional callback when sharing state changes */
  onShareStateChange?: (isSharing: boolean, stream: MediaStream | null) => void;
}

/**
 * Compact screen-share toggle + capture button for the overlay header.
 * Shows Monitor icon to start, MonitorOff (red) + Camera (blue) while active.
 */
export function ScreenShareButton({
  onCapture,
  onShareStateChange,
}: ScreenShareButtonProps) {
  const { isSharing, stream, startSharing, stopSharing, captureScreenshot } =
    useScreenShare();

  const handleToggle = async () => {
    if (isSharing) {
      stopSharing();
      onShareStateChange?.(false, null);
    } else {
      await startSharing();
      // State updates asynchronously; read from hook's internal ref via callback
      onShareStateChange?.(true, stream);
    }
  };

  const handleCapture = () => {
    const screenshot = captureScreenshot();
    if (screenshot) {
      onCapture(screenshot);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleToggle}
        title={isSharing ? "Stop screen sharing" : "Share screen"}
        aria-label={isSharing ? "Stop screen sharing" : "Share screen"}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full",
          "mac-icon-btn transition-all duration-150",
          isSharing
            ? "text-[#FF453A]"
            : "dark:text-mac-secondary-label light:text-gray-400",
        )}
      >
        {isSharing ? (
          <MonitorOff className="h-3 w-3" />
        ) : (
          <Monitor className="h-3 w-3" />
        )}
      </button>

      {isSharing && (
        <button
          onClick={handleCapture}
          title="Capture screenshot"
          aria-label="Capture screenshot"
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full",
            "mac-icon-btn transition-all duration-150",
            "text-[#0A84FF]",
          )}
        >
          <Camera className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
