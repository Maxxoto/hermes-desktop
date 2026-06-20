import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { useSpaces } from './use-spaces';

const EMOJI_OPTIONS = [
  '🏠', '💻', '📋', '🌙', '🎯', '🚀', '💡', '🎨',
  '📚', '🔧', '🧪', '🎵', '📷', '🌍', '⚡', '🔔',
  '💬', '🔬', '🎲', '🌸', '🔥', '✨', '🧠', '🛡️',
];

const COLOR_OPTIONS = [
  '#0A84FF', // blue
  '#30D158', // green
  '#FF9F0A', // orange
  '#BF5AF2', // purple
  '#FF453A', // red
  '#FFD60A', // yellow
  '#64D2FF', // cyan
  '#FF375F', // pink
  '#AC8E68', // brown
  '#8E8E93', // gray
];

interface SpaceSettingsProps {
  spaceId: string;
  onClose: () => void;
}

export default function SpaceSettings({ spaceId, onClose }: SpaceSettingsProps) {
  const space = useSpaces((s) => s.spaces.find((sp) => sp.id === spaceId));
  const renameSpace = useSpaces((s) => s.renameSpace);
  const setSpaceIcon = useSpaces((s) => s.setSpaceIcon);
  const setSpaceColor = useSpaces((s) => s.setSpaceColor);
  const deleteSpace = useSpaces((s) => s.deleteSpace);

  const [name, setName] = useState(space?.name ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!space) return null;

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== space.name) {
      renameSpace(spaceId, trimmed);
    }
    onClose();
  };

  const handleDelete = () => {
    deleteSpace(spaceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        className="glass-surface rounded-xl w-[320px] p-4 animate-cmdk-scale"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold dark:text-mac-label light:text-black">
            Space Settings
          </h3>
          <button
            onClick={onClose}
            className="mac-icon-btn !w-6 !h-6 dark:text-mac-secondary-label light:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon + Name row */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-2xl flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: `${space.color}20` }}
          >
            {space.icon}
          </span>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
            }}
            maxLength={20}
            className="flex-1 h-8 px-2.5 rounded-md text-[13px]
              glass-input
              dark:text-mac-label light:text-black
              outline-none"
          />
          <button
            onClick={handleSaveName}
            title="Save name"
            className="mac-icon-btn !w-7 !h-7 dark:text-mac-green light:text-green-600"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Icon picker */}
        <div className="mb-4">
          <p className="text-[11px] font-medium dark:text-mac-tertiary-label light:text-gray-500 uppercase tracking-wide mb-2">
            Icon
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSpaceIcon(spaceId, emoji)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[16px]
                  transition-all duration-100
                  ${space.icon === emoji
                    ? 'dark:bg-white/15 light:bg-black/10 scale-110'
                    : 'dark:hover:bg-white/8 light:hover:bg-black/5'
                  }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <p className="text-[11px] font-medium dark:text-mac-tertiary-label light:text-gray-500 uppercase tracking-wide mb-2">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                onClick={() => setSpaceColor(spaceId, color)}
                className="w-7 h-7 rounded-full transition-all duration-100 flex items-center justify-center"
                style={{
                  background: color,
                  boxShadow: space.color === color ? `0 0 0 2px ${color}, 0 0 0 4px ${color}40` : 'none',
                }}
                title={color}
              >
                {space.color === color && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Delete */}
        <div className="border-t dark:border-white/10 light:border-black/10 pt-3">
          {showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px] dark:text-mac-red light:text-red-500">
                Delete this space?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mac-btn !h-7 px-3 text-[11px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="mac-btn mac-btn-destructive !h-7 px-3 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-[12px] dark:text-mac-red light:text-red-500
                hover:dark:text-red-400 hover:light:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete Space
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
