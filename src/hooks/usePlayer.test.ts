import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PREFERENCES_KEY } from './usePreferences';
import { usePlayer } from './usePlayer';

const audio = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(true),
  pause: vi.fn().mockResolvedValue(undefined),
  complete: vi.fn().mockResolvedValue(undefined),
  setSound: vi.fn(),
  setVolume: vi.fn(),
  setBinaural: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../audio/engine', () => ({
  AudioEngine: class {
    supported = true;
    play = audio.play;
    pause = audio.pause;
    complete = audio.complete;
    setSound = audio.setSound;
    setVolume = audio.setVolume;
    setBinaural = audio.setBinaural;
    dispose = audio.dispose;
  },
}));

describe('usePlayer completion orchestration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'));
  });

  it('routes countdown completion through the selected cue and fade', async () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ timerMinutes: 1 }));
    const { result } = renderHook(() => usePlayer());
    await act(async () => result.current.toggle());
    await act(async () => { vi.advanceTimersByTime(60_100); await Promise.resolve(); });
    expect(audio.complete).toHaveBeenCalledWith('soft', 10, false);
    expect(result.current.completionMessage).toBe('Your focus session is complete.');
  });

  it('reverts notification settings when permission is denied', async () => {
    class NotificationDenied {
      static permission: NotificationPermission = 'default';
      static requestPermission = vi.fn().mockResolvedValue('denied');
    }
    vi.stubGlobal('Notification', NotificationDenied);
    const { result } = renderHook(() => usePlayer());
    await act(async () => result.current.requestNotifications(true));
    expect(result.current.completion.notifications).toBe(false);
    expect(result.current.notificationError).toContain('not granted');
    vi.unstubAllGlobals();
  });

  it('persists and applies the selected binaural profile', () => {
    const { result } = renderHook(() => usePlayer());

    act(() => result.current.setBinaural('alpha'));

    expect(result.current.binauralPreset).toBe('alpha');
    expect(audio.setBinaural).toHaveBeenCalledWith('alpha');
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toMatchObject({ binauralPreset: 'alpha' });
  });

  it('keeps the selected profile through pause, resume, volume and off changes', async () => {
    const { result } = renderHook(() => usePlayer());
    act(() => result.current.setBinaural('theta'));
    await act(async () => result.current.toggle());
    expect(audio.play).toHaveBeenLastCalledWith('arrive', 58, 'theta');
    act(() => result.current.setVolume(30));
    expect(audio.setVolume).toHaveBeenLastCalledWith(30);
    act(() => result.current.toggle());
    expect(audio.pause).toHaveBeenCalled();
    await act(async () => result.current.toggle());
    expect(audio.play).toHaveBeenLastCalledWith('arrive', 30, 'theta');
    act(() => result.current.setBinaural('off'));
    expect(audio.setBinaural).toHaveBeenLastCalledWith('off');
  });

  it.each(['recover', 'silence'] as const)('handles an automatic Pomodoro break with %s audio', async (breakAudio) => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
      binauralPreset: 'gamma',
      completion: { behavior: 'continue', cue: 'none' },
      pomodoro: { focusMinutes: 1, shortBreakMinutes: 1, autoStartBreaks: true, autoStartFocus: true, breakAudio },
    }));
    const { result } = renderHook(() => usePlayer());
    act(() => result.current.selectPomodoro());
    await act(async () => result.current.toggle());
    await act(async () => { vi.advanceTimersByTime(60_100); await Promise.resolve(); });
    expect(result.current.timer.phase).toBe('shortBreak');
    if (breakAudio === 'recover') {
      expect(audio.play).toHaveBeenLastCalledWith('downshift', 35, 'gamma');
      act(() => result.current.setVolume(40));
      expect(audio.setVolume).toHaveBeenLastCalledWith(24);
    } else {
      expect(audio.pause).toHaveBeenCalledWith(0.35);
      expect(result.current.isPlaying).toBe(false);
    }
    await act(async () => { vi.advanceTimersByTime(60_100); await Promise.resolve(); });
    expect(result.current.timer.phase).toBe('focus');
    expect(audio.play).toHaveBeenLastCalledWith('arrive', breakAudio === 'recover' ? 40 : 58, 'gamma');
  });
});
