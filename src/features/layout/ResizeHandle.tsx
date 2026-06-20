import { useCallback, useRef, useState } from "react";
import { useLayoutStore, SIDEBAR_DEFAULT_WIDTH } from "./use-layout";

/**
 * Draggable vertical resize handle for the sidebar.
 *
 * - 4px wide, full height
 * - Cursor: col-resize
 * - Drag to resize sidebar (200–400px)
 * - Double-click to reset to 240px
 * - Subtle hover effect
 */
export default function ResizeHandle() {
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startX.current = e.clientX;
      startWidth.current = useLayoutStore.getState().sidebarWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current;
        setSidebarWidth(startWidth.current + delta);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [setSidebarWidth]
  );

  const handleDoubleClick = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
  }, [setSidebarWidth]);

  return (
    <div
      data-testid="resize-handle"
      className="resize-handle"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
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
  );
}
