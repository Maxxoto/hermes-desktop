import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Keyboard shortcut → snap position mapping.
 *
 * On macOS the modifier is Cmd+Option; on other platforms it is
 * Ctrl+Alt.  The hook detects whichever modifier the user holds.
 */
const SHORTCUTS: Record<string, string> = {
  'mod+alt+ArrowLeft': 'left',
  'mod+alt+ArrowRight': 'right',
  'mod+alt+ArrowUp': 'top',
  'mod+alt+ArrowDown': 'bottom',
  'mod+alt+1': 'top-left',
  'mod+alt+2': 'top-right',
  'mod+alt+3': 'bottom-left',
  'mod+alt+4': 'bottom-right',
  'mod+alt+c': 'center',
  'mod+alt+f': 'maximize',
};

/**
 * React hook that listens for keyboard shortcuts and invokes the Rust
 * `snap_window` Tauri command to reposition the window.
 *
 * Usage: call `useWindowSnap()` once in a top-level component.
 */
export function useWindowSnap() {
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      // Require Cmd (macOS) or Ctrl (Linux/Windows) + Alt
      if (!e.metaKey && !e.ctrlKey) return;
      if (!e.altKey) return;

      // Normalise the key name so lookup works across platforms
      const keyName =
        e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const shortcutKey = `mod+alt+${keyName}`;
      const position = SHORTCUTS[shortcutKey];
      if (!position) return;

      e.preventDefault();

      try {
        await invoke('snap_window', { position });
      } catch (err) {
        console.error('Window snap failed:', err);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
