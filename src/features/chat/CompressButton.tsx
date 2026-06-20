import { Info, Ruler } from "lucide-react";

interface CompressButtonProps {
  messageCount: number;
}

export default function CompressButton({ messageCount }: CompressButtonProps) {
  return (
    <div className="relative flex items-center">
      {/* Message counter */}
      <span className="mr-2 text-[10px] dark:text-mac-tertiary-label light:text-gray-400 flex items-center gap-1 select-none">
        <Ruler className="w-3 h-3" />
        <span>
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </span>
      </span>

      {/* Info icon with tooltip */}
      <div className="group relative">
        <button
          title="Context is compressed automatically at 50%"
          className="mac-icon-btn"
          type="button"
        >
          <Info className="h-4 w-4" />
        </button>
        <div className="absolute top-full right-0 mt-2 z-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-3 py-1.5 rounded-lg glass-surface dark:text-mac-secondary-label light:text-gray-600 text-[10px] shadow-lg whitespace-nowrap">
            Context is compressed automatically at 50%
          </div>
        </div>
      </div>
    </div>
  );
}
