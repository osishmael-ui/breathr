import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, parsePreferences } from './usePreferences';

describe('parsePreferences', () => {
  it('uses deep lilac as the default theme', () => {
    expect(DEFAULT_PREFERENCES.theme).toBe('deep');
  });

  it('migrates the original preference shape', () => {
    const migrated = parsePreferences(JSON.stringify({ soundId: 'arrive', volume: 72, timerMinutes: 25 }));
    expect(migrated).toMatchObject({ version: 3, soundId: 'arrive', volume: 72, timerMinutes: 25, binauralPreset: 'off' });
    expect(migrated.customTimerMinutes).toBe(25);
    expect(migrated.completion).toEqual(DEFAULT_PREFERENCES.completion);
  });

  it('clamps invalid custom and Pomodoro values', () => {
    const parsed = parsePreferences(JSON.stringify({
      customTimerMinutes: 999,
      pomodoro: { focusMinutes: 0, shortBreakMinutes: 70, longBreakMinutes: 15, rounds: 12 },
    }));
    expect(parsed.customTimerMinutes).toBe(240);
    expect(parsed.pomodoro).toMatchObject({ focusMinutes: 1, shortBreakMinutes: 60, longBreakMinutes: 15, rounds: 8 });
  });

  it('restores only a valid binaural preset id', () => {
    expect(parsePreferences(JSON.stringify({ binauralPreset: 'alpha' })).binauralPreset).toBe('alpha');
    expect(parsePreferences(JSON.stringify({ binauralPreset: 'healing' })).binauralPreset).toBe('off');
  });
});
