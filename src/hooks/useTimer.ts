import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlayerPreferences, PomodoroPhase, TimerSession } from '../types';

export const SESSION_KEY = 'breathr:session';

const phaseSeconds = (phase: PomodoroPhase, preferences: PlayerPreferences) => {
  if (phase === 'focus') return preferences.pomodoro.focusMinutes * 60;
  if (phase === 'shortBreak') return preferences.pomodoro.shortBreakMinutes * 60;
  return preferences.pomodoro.longBreakMinutes * 60;
};

export function defaultSession(preferences: PlayerPreferences): TimerSession {
  return {
    mode: preferences.timerMinutes ? 'countdown' : 'open',
    status: 'idle',
    remainingSeconds: preferences.timerMinutes * 60,
    endsAt: null,
    phase: 'focus',
    completedFocusRounds: 0,
    completionId: 0,
    completedPhase: null,
  };
}

function stageNextPomodoro(session: TimerSession, preferences: PlayerPreferences, allowAutoStart: boolean): TimerSession {
  const focusJustEnded = session.phase === 'focus';
  const completedFocusRounds = focusJustEnded
    ? Math.min(preferences.pomodoro.rounds, session.completedFocusRounds + 1)
    : session.completedFocusRounds;
  const phase: PomodoroPhase = focusJustEnded
    ? (completedFocusRounds >= preferences.pomodoro.rounds ? 'longBreak' : 'shortBreak')
    : 'focus';
  const shouldAutoStart = allowAutoStart && (focusJustEnded
    ? preferences.pomodoro.autoStartBreaks
    : preferences.pomodoro.autoStartFocus);
  const remainingSeconds = phaseSeconds(phase, preferences);

  return {
    ...session,
    status: shouldAutoStart ? 'running' : 'idle',
    phase,
    completedFocusRounds: phase === 'focus' && session.phase === 'longBreak' ? 0 : completedFocusRounds,
    remainingSeconds,
    endsAt: shouldAutoStart ? Date.now() + remainingSeconds * 1000 : null,
    completionId: session.completionId + 1,
    completedPhase: session.phase,
  };
}

export function restoreSession(value: string | null, preferences: PlayerPreferences): TimerSession {
  if (!value) return defaultSession(preferences);
  try {
    const saved = JSON.parse(value) as Partial<TimerSession>;
    if (!saved.mode || !['open', 'countdown', 'pomodoro'].includes(saved.mode)) return defaultSession(preferences);
    const session: TimerSession = {
      ...defaultSession(preferences),
      ...saved,
      remainingSeconds: Math.max(0, Number(saved.remainingSeconds) || 0),
      endsAt: typeof saved.endsAt === 'number' ? saved.endsAt : null,
      completionId: Number(saved.completionId) || 0,
    };

    if (session.status !== 'running' || session.mode === 'open' || !session.endsAt) return session;
    const remainingSeconds = Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000));
    if (remainingSeconds > 0) return { ...session, remainingSeconds };
    if (session.mode === 'pomodoro') return stageNextPomodoro(session, preferences, false);
    return { ...session, status: 'completed', remainingSeconds: 0, endsAt: null, completionId: session.completionId + 1, completedPhase: 'countdown' };
  } catch {
    return defaultSession(preferences);
  }
}

export function useTimer(preferences: PlayerPreferences) {
  const [session, setSession] = useState<TimerSession>(() => restoreSession(localStorage.getItem(SESSION_KEY), preferences));

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (session.status !== 'running' || session.mode === 'open' || !session.endsAt) return;
    const update = () => {
      setSession((current) => {
        if (current.status !== 'running' || !current.endsAt) return current;
        const remainingSeconds = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
        if (remainingSeconds > 0) return remainingSeconds === current.remainingSeconds ? current : { ...current, remainingSeconds };
        if (current.mode === 'pomodoro') return stageNextPomodoro(current, preferences, true);
        return {
          ...current,
          status: 'completed',
          remainingSeconds: 0,
          endsAt: null,
          completionId: current.completionId + 1,
          completedPhase: 'countdown',
        };
      });
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [preferences, session.endsAt, session.mode, session.status]);

  const start = useCallback(() => {
    setSession((current) => {
      if (current.mode === 'open') return { ...current, status: 'running', endsAt: null, completedPhase: null };
      let remainingSeconds = current.remainingSeconds;
      if (current.status === 'completed' || remainingSeconds === 0) {
        remainingSeconds = current.mode === 'pomodoro'
          ? phaseSeconds(current.phase, preferences)
          : preferences.timerMinutes * 60;
      }
      return { ...current, status: 'running', remainingSeconds, endsAt: Date.now() + remainingSeconds * 1000, completedPhase: null };
    });
  }, [preferences]);

  const pause = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'running') return current;
      const remainingSeconds = current.endsAt
        ? Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000))
        : current.remainingSeconds;
      return { ...current, status: 'paused', remainingSeconds, endsAt: null };
    });
  }, []);

  const selectCountdown = useCallback((minutes: number) => {
    const duration = Math.max(1, Math.min(240, Math.round(minutes)));
    setSession((current) => ({
      ...current,
      mode: 'countdown',
      status: current.status === 'running' ? 'running' : 'idle',
      remainingSeconds: duration * 60,
      endsAt: current.status === 'running' ? Date.now() + duration * 60 * 1000 : null,
      completedPhase: null,
    }));
  }, []);

  const selectOpen = useCallback(() => {
    setSession((current) => ({
      ...current,
      mode: 'open',
      status: current.status === 'running' ? 'running' : 'idle',
      remainingSeconds: 0,
      endsAt: null,
      completedPhase: null,
    }));
  }, []);

  const selectPomodoro = useCallback(() => {
    setSession((current) => {
      if (current.mode === 'pomodoro') return current;
      const remainingSeconds = preferences.pomodoro.focusMinutes * 60;
      return {
        ...current,
        mode: 'pomodoro',
        status: current.status === 'running' ? 'running' : 'idle',
        phase: 'focus',
        completedFocusRounds: 0,
        remainingSeconds,
        endsAt: current.status === 'running' ? Date.now() + remainingSeconds * 1000 : null,
        completedPhase: null,
      };
    });
  }, [preferences.pomodoro.focusMinutes]);

  const skipPhase = useCallback(() => {
    setSession((current) => {
      if (current.mode !== 'pomodoro') return current;
      const phase: PomodoroPhase = current.phase === 'focus' ? 'shortBreak' : 'focus';
      const completedFocusRounds = current.phase === 'longBreak' ? 0 : current.completedFocusRounds;
      return {
        ...current,
        status: 'idle',
        phase,
        completedFocusRounds,
        remainingSeconds: phaseSeconds(phase, preferences),
        endsAt: null,
        completedPhase: null,
      };
    });
  }, [preferences]);

  const resetPomodoro = useCallback(() => {
    setSession((current) => ({
      ...current,
      mode: 'pomodoro',
      status: 'idle',
      phase: 'focus',
      completedFocusRounds: 0,
      remainingSeconds: preferences.pomodoro.focusMinutes * 60,
      endsAt: null,
      completedPhase: null,
    }));
  }, [preferences.pomodoro.focusMinutes]);

  const formattedTime = useMemo(() => {
    if (session.mode === 'open') return '∞';
    const minutes = Math.floor(session.remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (session.remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [session.mode, session.remainingSeconds]);

  return { session, formattedTime, start, pause, selectCountdown, selectOpen, selectPomodoro, skipPhase, resetPomodoro };
}
