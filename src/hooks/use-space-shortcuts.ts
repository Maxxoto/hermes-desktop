import { useEffect, useCallback } from 'react';
import { useSpaces } from '../features/spaces/use-spaces';

/**
 * Keyboard shortcuts for switching between spaces.
 *
 * - Cmd/Ctrl + 1-9: Switch to space by index
 * - Cmd/Ctrl + Shift + N: Create new space (triggers a custom event)
 */
export function useSpaceShortcuts() {
  const spaces = useSpaces((s) => s.spaces);
  const setActiveSpace = useSpaces((s) => s.setActiveSpace);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+1-9 to switch spaces
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && !e.shiftKey && !e.altKey) {
        const index = num - 1;
        if (index < spaces.length) {
          e.preventDefault();
          setActiveSpace(spaces[index].id);
        }
        return;
      }

      // Cmd+Shift+N to create new space
      if ((e.key === 'n' || e.key === 'N') && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('hermes:create-space'));
      }
    },
    [spaces, setActiveSpace],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
