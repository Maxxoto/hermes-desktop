import { useSpaces } from './use-spaces';

interface SpacePickerProps {
  sessionId: string;
  onSelect: (spaceId: string) => void;
  onClose: () => void;
}

/**
 * Compact dropdown to pick a space to move a session into.
 * Used in SessionItem context menu.
 */
export default function SpacePicker({ sessionId, onSelect, onClose }: SpacePickerProps) {
  const spaces = useSpaces((s) => s.spaces);
  const getSpaceForSession = useSpaces((s) => s.getSpaceForSession);
  const currentSpace = getSpaceForSession(sessionId);

  return (
    <div className="glass-surface rounded-lg py-1 min-w-[140px] animate-cmdk-scale">
      {spaces.map((space) => {
        const isCurrent = currentSpace?.id === space.id;
        return (
          <button
            key={space.id}
            onClick={() => {
              onSelect(space.id);
              onClose();
            }}
            disabled={isCurrent}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px]
              transition-colors
              ${isCurrent
                ? 'dark:text-mac-tertiary-label light:text-gray-400 cursor-default'
                : 'dark:text-mac-label light:text-black hover:bg-white/10'
              }`}
          >
            <span className="text-[13px]">{space.icon}</span>
            <span>{space.name}</span>
            {isCurrent && <span className="ml-auto text-[10px] opacity-50">current</span>}
          </button>
        );
      })}
    </div>
  );
}
