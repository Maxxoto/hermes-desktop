import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useSpaces } from './use-spaces';
import SpaceSettings from './SpaceSettings';

/**
 * SpaceBar — compact horizontal space switcher at the top of the sidebar.
 * Each space is a pill with icon + name. Active space has accent color.
 * Keyboard: Cmd+1-4 to switch spaces.
 */
export default function SpaceBar() {
  const spaces = useSpaces((s) => s.spaces);
  const activeSpaceId = useSpaces((s) => s.activeSpaceId);
  const setActiveSpace = useSpaces((s) => s.setActiveSpace);
  const createSpace = useSpaces((s) => s.createSpace);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [settingsSpaceId, setSettingsSpaceId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreate && createInputRef.current) {
      createInputRef.current.focus();
      createInputRef.current.select();
    }
  }, [showCreate]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createSpace(trimmed, newIcon);
    setNewName('');
    setNewIcon('✨');
    setShowCreate(false);
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setShowCreate(false);
      setNewName('');
      setNewIcon('✨');
    }
  };

  return (
    <>
      <div className="shrink-0 px-2 pt-2 pb-1">
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Spaces"
        >
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <button
                key={space.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSpace(space.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSettingsSpaceId(space.id);
                }}
                className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full
                  text-[12px] font-medium transition-all duration-150
                  whitespace-nowrap select-none"
                style={
                  isActive
                    ? {
                        background: `${space.color}20`,
                        border: `1px solid ${space.color}60`,
                        color: space.color,
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: undefined,
                      }
                }
                title={space.name}
              >
                <span className="text-[13px] leading-none">{space.icon}</span>
                <span className="dark:text-mac-secondary-label light:text-gray-600">
                  {space.name}
                </span>
              </button>
            );
          })}

          {/* Add space button */}
          {showCreate ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                ref={createInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                onBlur={() => {
                  if (!newName.trim()) setShowCreate(false);
                }}
                placeholder="Name…"
                maxLength={20}
                className="h-7 w-20 px-2 rounded-full text-[12px]
                  glass-input
                  dark:text-mac-label light:text-black
                  dark:placeholder:text-mac-tertiary-label light:placeholder:text-gray-400
                  outline-none"
              />
              <button
                onClick={() => setShowCreate(false)}
                className="mac-icon-btn !w-6 !h-6 dark:text-mac-secondary-label light:text-gray-500"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full
                border border-dashed dark:border-white/20 light:border-black/15
                dark:text-mac-tertiary-label light:text-gray-400
                hover:dark:bg-white/5 hover:light:bg-black/5
                transition-colors duration-150"
              title="Add space"
              aria-label="Add space"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Space settings modal */}
      {settingsSpaceId && (
        <SpaceSettings
          spaceId={settingsSpaceId}
          onClose={() => setSettingsSpaceId(null)}
        />
      )}
    </>
  );
}
