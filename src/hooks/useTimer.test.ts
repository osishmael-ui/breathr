import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from './usePreferences';
import { restoreSession, SESSION_KEY, useTimer } from './useTimer';

describe('timer state', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'));
  });

  it('completes and restarts a countdown from its selected duration', () => {
    const preferences = { ...DEFAULT_PREFERENCES, timerMinutes: 1 };
    const { result } = renderHook(() => useTimer(preferences));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.session.status).toBe('completed');
    expect(result.current.session.remainingSeconds).toBe(0);
    act(() => result.current.start());
    expect(result.current.session.status).toBe('running');
    expect(result.current.session.remainingSeconds).toBe(60);
  });

  it('stages a short break after a completed focus phase', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      pomodoro: { ...DEFAULT_PREFERENCES.pomodoro, focusMinutes: 1, shortBreakMinutes: 1 },
    };
    const { result } = renderHook(() => useTimer(preferences));
    act(() => { result.current.selectPomodoro(); result.current.start(); });
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.session).toMatchObject({ phase: 'shortBreak', status: 'idle', completedFocusRounds: 1 });
  });

  it('restarts immediately when a new duration is selected while running', () => {
    const preferences = { ...DEFAULT_PREFERENCES, timerMinutes: 25 };
    const { result } = renderHook(() => useTimer(preferences));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.selectCountdown(50));
    expect(result.current.session).toMatchObject({ status: 'running', remainingSeconds: 3000 });
    expect(result.current.session.endsAt).toBe(Date.now() + 3_000_000);
  });

  it('auto-starts an enabled break but not the following focus phase', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      pomodoro: { ...DEFAULT_PREFERENCES.pomodoro, focusMinutes: 1, shortBreakMinutes: 1, autoStartBreaks: true },
    };
    const { result } = renderHook(() => useTimer(preferences));
    act(() => result.current.selectPomodoro());
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.session).toMatchObject({ phase: 'shortBreak', status: 'running' });
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.session).toMatchObject({ phase: 'focus', status: 'idle', completedFocusRounds: 1 });
  });

  it('schedules a long break after the configured focus rounds', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      pomodoro: {
        ...DEFAULT_PREFERENCES.pomodoro,
        focusMinutes: 1,
        shortBreakMinutes: 1,
        longBreakMinutes: 2,
        rounds: 2,
      },
    };
    const { result } = renderHook(() => useTimer(preferences));
    act(() => result.current.selectPomodoro());
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_100));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_100));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.session).toMatchObject({ phase: 'longBreak', status: 'idle', completedFocusRounds: 2, remainingSeconds: 120 });
  });

  it('restores elapsed countdowns as completed', () => {
    const saved = {
      mode: 'countdown', status: 'running', remainingSeconds: 10, endsAt: Date.now() - 1,
      phase: 'focus', completedFocusRounds: 0, completionId: 0, completedPhase: null,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    expect(restoreSession(localStorage.getItem(SESSION_KEY), DEFAULT_PREFERENCES)).toMatchObject({ status: 'completed', remainingSeconds: 0 });
  });

  it('restores a still-running countdown from its absolute timestamp', () => {
    const saved = {
      mode: 'countdown', status: 'running', remainingSeconds: 60, endsAt: Date.now() + 30_000,
      phase: 'focus', completedFocusRounds: 0, completionId: 0, completedPhase: null,
    };
    const restored = restoreSession(JSON.stringify(saved), DEFAULT_PREFERENCES);
    expect(restored).toMatchObject({ status: 'running', remainingSeconds: 30, endsAt: saved.endsAt });
  });
});
