import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import type { BinauralPresetId, PlayerPreferences, SoundId, ThemeId } from '../types';
import { usePreferences } from './usePreferences';
import { useTimer } from './useTimer';
import { useWakeLock } from './useWakeLock';

const phaseName = (phase: 'focus' | 'shortBreak' | 'longBreak') => {
  if (phase === 'shortBreak') return 'Short break';
  if (phase === 'longBreak') return 'Long break';
  return 'Focus';
};

export function usePlayer() {
  const { preferences, updatePreferences, updateCompletion, updatePomodoro } = usePreferences();
  const timer = useTimer(preferences);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<'ready' | 'starting' | 'unsupported'>('ready');
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const engine = useRef<AudioEngine | null>(null);
  const lastVolume = useRef(preferences.volume || 58);
  const handledCompletion = useRef(timer.session.completionId);

  if (!engine.current && typeof window !== 'undefined') engine.current = new AudioEngine();

  const wakeLock = useWakeLock(preferences.keepAwake && timer.session.status === 'running');

  useEffect(() => () => engine.current?.dispose(), []);

  const soundForPhase = useCallback((): { soundId: SoundId; volume: number } | null => {
    if (timer.session.mode === 'pomodoro' && timer.session.phase !== 'focus') {
      if (preferences.pomodoro.breakAudio === 'silence') return null;
      return { soundId: 'downshift', volume: Math.round(preferences.volume * 0.6) };
    }
    return { soundId: preferences.soundId, volume: preferences.volume };
  }, [preferences.pomodoro.breakAudio, preferences.soundId, preferences.volume, timer.session.mode, timer.session.phase]);

  const notifyCompletion = useCallback((message: string) => {
    setCompletionMessage(message);
    if (
      preferences.completion.notifications
      && document.visibilityState === 'hidden'
      && 'Notification' in window
      && Notification.permission === 'granted'
    ) {
      new Notification('Breathr', { body: message, icon: '/icon-192.png' });
    }
  }, [preferences.completion.notifications]);

  useEffect(() => {
    if (timer.session.completionId === handledCompletion.current) return;
    handledCompletion.current = timer.session.completionId;
    const completed = timer.session.completedPhase;
    if (!completed) return;

    const message = completed === 'countdown'
      ? 'Your focus session is complete.'
      : `${phaseName(completed)} complete.`;
    notifyCompletion(message);

    const handleAudioTransition = async () => {
      const keepPlaying = preferences.completion.behavior === 'continue';
      await engine.current?.complete(
        preferences.completion.cue,
        keepPlaying ? 0 : preferences.completion.fadeSeconds,
        keepPlaying,
      );

      if (!keepPlaying) setIsPlaying(false);
      if (timer.session.mode !== 'pomodoro' || timer.session.status !== 'running') return;

      const nextSound = soundForPhase();
      if (!nextSound) {
        await engine.current?.pause(0.35);
        setIsPlaying(false);
        return;
      }
      const started = await engine.current?.play(nextSound.soundId, nextSound.volume, preferences.binauralPreset);
      setIsPlaying(Boolean(started));
    };

    void handleAudioTransition();
  }, [notifyCompletion, preferences.binauralPreset, preferences.completion, soundForPhase, timer.session.completedPhase, timer.session.completionId, timer.session.mode, timer.session.status]);

  const pause = useCallback(() => {
    void engine.current?.pause();
    setIsPlaying(false);
    timer.pause();
  }, [timer]);

  const play = useCallback(async () => {
    if (!engine.current?.supported) {
      setStatus('unsupported');
      return;
    }
    const phaseSound = soundForPhase();
    if (!phaseSound) {
      timer.start();
      setIsPlaying(false);
      return;
    }
    setStatus('starting');
    const started = await engine.current.play(phaseSound.soundId, phaseSound.volume, preferences.binauralPreset);
    setStatus(started ? 'ready' : 'unsupported');
    if (!started) return;
    setIsPlaying(true);
    if (timer.session.status !== 'running') timer.start();
  }, [preferences.binauralPreset, soundForPhase, timer]);

  const toggle = useCallback(() => {
    const silentRunningBreak = timer.session.status === 'running'
      && timer.session.mode === 'pomodoro'
      && timer.session.phase !== 'focus'
      && preferences.pomodoro.breakAudio === 'silence';
    if (isPlaying || silentRunningBreak) pause(); else void play();
  }, [isPlaying, pause, play, preferences.pomodoro.breakAudio, timer.session.mode, timer.session.phase, timer.session.status]);

  const setSound = useCallback((soundId: SoundId) => {
    updatePreferences({ soundId });
    if (timer.session.mode !== 'pomodoro' || timer.session.phase === 'focus') engine.current?.setSound(soundId);
  }, [timer.session.mode, timer.session.phase, updatePreferences]);

  const setVolume = useCallback((volume: number) => {
    const nextVolume = Math.max(0, Math.min(100, volume));
    if (nextVolume > 0) lastVolume.current = nextVolume;
    updatePreferences({ volume: nextVolume });
    const adjusted = timer.session.mode === 'pomodoro' && timer.session.phase !== 'focus'
      ? Math.round(nextVolume * 0.6)
      : nextVolume;
    engine.current?.setVolume(adjusted);
  }, [timer.session.mode, timer.session.phase, updatePreferences]);

  const toggleMute = useCallback(() => {
    setVolume(preferences.volume > 0 ? 0 : lastVolume.current || 58);
  }, [preferences.volume, setVolume]);

  const setTimer = useCallback((minutes: number) => {
    updatePreferences({ timerMinutes: minutes });
    if (minutes === 0) timer.selectOpen(); else timer.selectCountdown(minutes);
  }, [timer, updatePreferences]);

  const setCustomTimer = useCallback((minutes: number) => {
    const duration = Math.max(1, Math.min(240, Math.round(minutes)));
    updatePreferences({ timerMinutes: duration, customTimerMinutes: duration });
    timer.selectCountdown(duration);
  }, [timer, updatePreferences]);

  const setTheme = useCallback((theme: ThemeId) => updatePreferences({ theme }), [updatePreferences]);

  const setBinaural = useCallback((binauralPreset: BinauralPresetId) => {
    updatePreferences({ binauralPreset });
    engine.current?.setBinaural(binauralPreset);
  }, [updatePreferences]);

  const requestNotifications = useCallback(async (enabled: boolean) => {
    setNotificationError(null);
    if (!enabled) {
      updateCompletion({ notifications: false });
      return;
    }
    if (!('Notification' in window)) {
      setNotificationError('Notifications are not supported in this browser.');
      updateCompletion({ notifications: false });
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') updateCompletion({ notifications: true });
    else {
      updateCompletion({ notifications: false });
      setNotificationError('Notification permission was not granted.');
    }
  }, [updateCompletion]);

  const timerCaption = useMemo(() => {
    if (timer.session.mode === 'open') return timer.session.status === 'running' ? 'open-ended session' : 'open-ended';
    if (timer.session.mode === 'pomodoro') {
      const round = Math.min(preferences.pomodoro.rounds, timer.session.completedFocusRounds + (timer.session.phase === 'focus' ? 1 : 0));
      return `${phaseName(timer.session.phase)} · ${Math.max(1, round)} of ${preferences.pomodoro.rounds}`;
    }
    if (timer.session.status === 'completed') return 'session complete';
    return timer.session.status === 'running' ? 'remaining' : 'focus timer';
  }, [preferences.pomodoro.rounds, timer.session]);

  return {
    ...preferences,
    preferences,
    isPlaying,
    status,
    timer: timer.session,
    formattedTime: timer.formattedTime,
    timerCaption,
    completionMessage,
    notificationError,
    wakeLock,
    toggle,
    setSound,
    setVolume,
    toggleMute,
    setTimer,
    setCustomTimer,
    selectPomodoro: timer.selectPomodoro,
    skipPhase: timer.skipPhase,
    resetPomodoro: timer.resetPomodoro,
    updatePreferences,
    updateCompletion,
    updatePomodoro,
    setTheme,
    setBinaural,
    requestNotifications,
    dismissCompletion: () => setCompletionMessage(null),
  };
}
