import { useState, useCallback } from "react";
import { Minimize2, Check } from "lucide-react";
interface CompressButtonProps {
  messageCount: number;
}

export default function CompressButton({ messageCount }: CompressButtonProps) {
  const [compressedAt, setCompressedAt] = useState<Date | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleCompress = useCallback(() => {
    setCompressedAt(new Date());
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  return (
    <div className="relative flex items-center">
      {/* Message counter */}
      <span className="mr-2 text-xs text-gray-500 flex items-center gap-1 select-none">
        <span>📏</span>
        <span>
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </span>
      </span>

      {/* Compress button */}
      <button
        onClick={handleCompress}
        title="Compress context"
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <Minimize2 className="h-4 w-4" />
      </button>

      {/* Last compressed indicator */}
      {compressedAt && (
        <span
          className="ml-1.5 text-[10px] text-gray-600 flex items-center gap-0.5"
          title={`Last compressed: ${compressedAt.toLocaleTimeString()}`}
        >
          <Check className="h-3 w-3" />
        </span>
      )}

      {/* Toast notification */}
      {showToast && (
        <div className="absolute top-full right-0 mt-2 z-40 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs shadow-lg whitespace-nowrap">
            <Check className="h-3 w-3" />
            Context compressed
          </div>
        </div>
      )}
    </div>
  );
}
