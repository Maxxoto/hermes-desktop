import { Info } from "lucide-react";

interface CompressButtonProps {
  messageCount: number;
}

export default function CompressButton({ messageCount }: CompressButtonProps) {
  return (
    <div className="relative flex items-center">
      {/* Message counter */}
      <span className="mr-2 text-xs text-gray-500 flex items-center gap-1 select-none">
        <span>📏</span>
        <span>
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </span>
      </span>

      {/* Info icon with tooltip */}
      <div className="group relative">
        <button
          title="Context is compressed automatically at 50%"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
          type="button"
        >
          <Info className="h-4 w-4" />
        </button>
        <div className="absolute top-full right-0 mt-2 z-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs shadow-lg whitespace-nowrap border border-gray-700">
            Context is compressed automatically at 50%
          </div>
        </div>
      </div>
    </div>
  );
}
