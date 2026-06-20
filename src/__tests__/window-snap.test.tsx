/**
 * window-snap.test.tsx — Tests for the useWindowSnap hook.
 *
 * Verifies that keyboard shortcuts trigger the correct Tauri invoke call.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowSnap } from '../features/minimalism/use-window-snap';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInvoke = vi.fn().mockResolvedValue(undefined);

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    metaKey: opts.metaKey ?? true,
    altKey: opts.altKey ?? true,
    ctrlKey: opts.ctrlKey ?? false,
  });
  window.dispatchEvent(event);
  return event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWindowSnap', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('calls invoke with "left" for Cmd+Option+ArrowLeft', async () => {
    renderHook(() => useWindowSnap());

    let event: KeyboardEvent;
    await act(async () => {
      event = fireKey('ArrowLeft');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'left',
    });
    expect(event!.defaultPrevented).toBe(true);
  });

  it('calls invoke with "right" for Cmd+Option+ArrowRight', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('ArrowRight');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'right',
    });
  });

  it('calls invoke with "top-left" for Cmd+Option+1', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('1');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'top-left',
    });
  });

  it('calls invoke with "bottom-right" for Cmd+Option+4', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('4');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'bottom-right',
    });
  });

  it('calls invoke with "center" for Cmd+Option+c', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('c');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'center',
    });
  });

  it('calls invoke with "maximize" for Cmd+Option+f', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('f');
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'maximize',
    });
  });

  it('does NOT invoke snap_window when only Alt is pressed (no Cmd/Ctrl)', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('ArrowLeft', { metaKey: false, ctrlKey: false, altKey: true });
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('does NOT invoke snap_window for an unrecognised shortcut', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('z');
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('works with Ctrl instead of Cmd (Linux/Windows)', async () => {
    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('ArrowDown', { metaKey: false, ctrlKey: true, altKey: true });
    });

    expect(mockInvoke).toHaveBeenCalledWith('snap_window', {
      position: 'bottom',
    });
  });

  it('cleans up event listener on unmount', async () => {
    const { unmount } = renderHook(() => useWindowSnap());

    unmount();

    await act(async () => {
      fireKey('ArrowLeft');
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('logs error when invoke fails', async () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockInvoke.mockRejectedValueOnce('Window not found');

    renderHook(() => useWindowSnap());

    await act(async () => {
      fireKey('ArrowLeft');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Window snap failed:',
      'Window not found',
    );
    consoleSpy.mockRestore();
  });
});
