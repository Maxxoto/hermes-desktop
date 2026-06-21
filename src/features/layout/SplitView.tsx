import { useCallback, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLayoutStore } from "./use-layout";

interface SplitViewProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  onClose: () => void;
}

/**
 * Two-panel split view with a draggable center divider.
 *
 * - Uses CSS flexbox
 * - Divider is 4px wide, draggable
 * - Each panel has independent scroll
 * - Close button to return to single view
 */
export default function SplitView({ leftPanel, rightPanel, onClose }: SplitViewProps) {
  const splitRatio = useLayoutStore((s) => s.splitRatio);
  const setSplitRatio = useLayoutStore((s) => s.setSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startRatio = useRef(0);

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startX.current = e.clientX;
      startRatio.current = useLayoutStore.getState().splitRatio;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const delta = ev.clientX - startX.current;
        const ratioDelta = delta / rect.width;
        setSplitRatio(startRatio.current + ratioDelta);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [setSplitRatio]
  );

  const leftPercent = splitRatio * 100;
  const rightPercent = (1 - splitRatio) * 100;

  return (
    <div
      ref={containerRef}
      data-testid="split-view"
      className="flex flex-1 min-h-0 overflow-hidden"
      style={{ userSelect: isDragging ? "none" : undefined }}
    >
      {/* Left panel */}
      <div
        className="flex flex-col min-h-0 overflow-hidden"
        style={{
          width: `${leftPercent}%`,
        }}
      >
        {leftPanel}
      </div>

      {/* Divider */}
      <div
        data-testid="split-divider"
        onMouseDown={handleDividerMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          width: 4,
          cursor: "col-resize",
          flexShrink: 0,
          backgroundColor: isHovering || isDragging
            ? "rgba(10, 132, 255, 0.4)"
            : "rgba(255, 255, 255, 0.1)",
          transition: isDragging ? "none" : "background-color 200ms ease-out",
          userSelect: "none",
        }}
      />

      {/* Right panel */}
      <div
        className="flex flex-col min-h-0 overflow-hidden relative"
        style={{
          width: `${rightPercent}%`,
        }}
      >
        {/* Close button to return to single view */}
        <button
          onClick={onClose}
          data-testid="split-close-right"
          className="absolute top-1 right-1 z-10 mac-icon-btn !w-6 !h-6"
          title="Close split view"
          aria-label="Close split view"
        >
          <X className="h-3 w-3" />
        </button>
        {rightPanel}
      </div>
    </div>
  );
}
