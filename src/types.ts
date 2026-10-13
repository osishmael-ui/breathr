export type SoundId = 'restore' | 'arrive' | 'downshift';
export type TimerMode = 'open' | 'countdown' | 'pomodoro';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';
export type CompletionCue = 'soft' | 'double' | 'none';
export type CompletionBehavior = 'stop' | 'continue';
export type ThemeId = 'system' | 'rill' | 'deep' | 'mist';
export type BreakAudio = 'recover' | 'silence';
export type BinauralPresetId = 'off' | 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';

export interface SoundPreset {
  id: SoundId;
  name: string;
  eyebrow: string;
  description: string;
  warmth: string;
}

export interface PlayerPreferences {
  version: 3;
  soundId: SoundId;
  volume: number;
  timerMinutes: number;
  customTimerMinutes: number;
  completion: CompletionPreferences;
  pomodoro: PomodoroPreferences;
  theme: ThemeId;
  keepAwake: boolean;
  binauralPreset: BinauralPresetId;
}

export interface CompletionPreferences {
  cue: CompletionCue;
  fadeSeconds: 0 | 10 | 30;
  behavior: CompletionBehavior;
  notifications: boolean;
}

export interface PomodoroPreferences {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  rounds: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  breakAudio: BreakAudio;
}

export interface TimerSession {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  endsAt: number | null;
  phase: PomodoroPhase;
  completedFocusRounds: number;
  completionId: number;
  completedPhase: PomodoroPhase | 'countdown' | null;
}
