import { useCallback, useEffect, useState } from 'react';
import { SOUND_PRESETS } from '../audio/presets';
import type { BinauralPresetId, PlayerPreferences } from '../types';

export const PREFERENCES_KEY = 'breathr:preferences';

export const DEFAULT_PREFERENCES: PlayerPreferences = {
  version: 3,
  soundId: 'arrive',
  volume: 58,
  timerMinutes: 50,
  customTimerMinutes: 40,
  completion: {
    cue: 'soft',
    fadeSeconds: 10,
    behavior: 'stop',
    notifications: false,
  },
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    rounds: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
        breakAudio: 'recover',
  },
  theme: 'deep',
  keepAwake: false,
  binauralPreset: 'off',
};

const BINAURAL_PRESET_IDS: BinauralPresetId[] = ['off', 'delta', 'theta', 'alpha', 'beta', 'gamma'];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback
);

export function parsePreferences(value: string | null): PlayerPreferences {
  if (!value) return DEFAULT_PREFERENCES;
  try {
    const saved = JSON.parse(value) as Partial<PlayerPreferences> & Record<string, unknown>;
    const completion = saved.completion as Partial<PlayerPreferences['completion']> | undefined;
    const pomodoro = saved.pomodoro as Partial<PlayerPreferences['pomodoro']> | undefined;
    const timerMinutes = numberInRange(saved.timerMinutes, DEFAULT_PREFERENCES.timerMinutes, 0, 240);

    return {
      version: 3,
      soundId: saved.soundId && saved.soundId in SOUND_PRESETS ? saved.soundId : DEFAULT_PREFERENCES.soundId,
      volume: numberInRange(saved.volume, DEFAULT_PREFERENCES.volume, 0, 100),
      timerMinutes,
      customTimerMinutes: numberInRange(saved.customTimerMinutes, timerMinutes || DEFAULT_PREFERENCES.customTimerMinutes, 1, 240),
      completion: {
        cue: completion?.cue && ['soft', 'double', 'none'].includes(completion.cue) ? completion.cue : DEFAULT_PREFERENCES.completion.cue,
        fadeSeconds: completion?.fadeSeconds === 0 || completion?.fadeSeconds === 10 || completion?.fadeSeconds === 30
          ? completion.fadeSeconds
          : DEFAULT_PREFERENCES.completion.fadeSeconds,
        behavior: completion?.behavior === 'continue' ? 'continue' : 'stop',
        notifications: completion?.notifications === true,
      },
      pomodoro: {
        focusMinutes: numberInRange(pomodoro?.focusMinutes, DEFAULT_PREFERENCES.pomodoro.focusMinutes, 1, 180),
        shortBreakMinutes: numberInRange(pomodoro?.shortBreakMinutes, DEFAULT_PREFERENCES.pomodoro.shortBreakMinutes, 1, 60),
        longBreakMinutes: numberInRange(pomodoro?.longBreakMinutes, DEFAULT_PREFERENCES.pomodoro.longBreakMinutes, 1, 60),
        rounds: numberInRange(pomodoro?.rounds, DEFAULT_PREFERENCES.pomodoro.rounds, 1, 8),
        autoStartBreaks: pomodoro?.autoStartBreaks === true,
        autoStartFocus: pomodoro?.autoStartFocus === true,
        breakAudio: pomodoro?.breakAudio === 'silence' ? 'silence' : 'recover',
      },
      theme: saved.theme && ['system', 'rill', 'deep', 'mist'].includes(saved.theme) ? saved.theme : DEFAULT_PREFERENCES.theme,
      keepAwake: saved.keepAwake === true,
      binauralPreset: saved.binauralPreset && BINAURAL_PRESET_IDS.includes(saved.binauralPreset)
        ? saved.binauralPreset
        : DEFAULT_PREFERENCES.binauralPreset,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<PlayerPreferences>(() => parsePreferences(localStorage.getItem(PREFERENCES_KEY)));

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = useCallback((patch: Partial<PlayerPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch, version: 3 }));
  }, []);

  const updateCompletion = useCallback((patch: Partial<PlayerPreferences['completion']>) => {
    setPreferences((current) => ({ ...current, completion: { ...current.completion, ...patch } }));
  }, []);

  const updatePomodoro = useCallback((patch: Partial<PlayerPreferences['pomodoro']>) => {
    setPreferences((current) => ({ ...current, pomodoro: { ...current.pomodoro, ...patch } }));
  }, []);

  return { preferences, updatePreferences, updateCompletion, updatePomodoro };
}
