import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const actions = () => ({
  toggle: vi.fn(), toggleMute: vi.fn(), adjustVolume: vi.fn(), selectTimer: vi.fn(),
  openCustomTimer: vi.fn(), selectPomodoro: vi.fn(), openShortcuts: vi.fn(), closePanels: vi.fn(),
});

describe('keyboard shortcuts', () => {
  it('routes playback and timer shortcuts', () => {
    const handlers = actions();
    renderHook(() => useKeyboardShortcuts(handlers));
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: '3' });
    expect(handlers.toggle).toHaveBeenCalledOnce();
    expect(handlers.selectTimer).toHaveBeenCalledWith(50);
  });

  it('ignores shortcuts from editable controls', () => {
    const handlers = actions();
    renderHook(() => useKeyboardShortcuts(handlers));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: ' ' });
    expect(handlers.toggle).not.toHaveBeenCalled();
    input.remove();
  });
});
