import { useState, useCallback, type DragEvent } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onDrop: (files: FileList) => void;
  children: React.ReactNode;
}

export default function DropZone({ onDrop, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files?.length > 0) {
        onDrop(e.dataTransfer.files);
      }
    },
    [onDrop],
  );

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center dark:bg-mac-accent/10 light:bg-blue-50/80 border-2 border-dashed dark:border-mac-accent/40 light:border-blue-300 rounded-xl backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 dark:text-mac-accent light:text-blue-500" />
            <p className="text-[13px] font-medium dark:text-mac-accent light:text-blue-600">
              Drop files here
            </p>
            <p className="text-[11px] dark:text-mac-tertiary-label light:text-gray-400">
              Images, PDFs, text files up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
