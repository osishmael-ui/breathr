import type { BinauralPresetId, CompletionCue, SoundId } from '../types';
import { BINAURAL_PRESETS, binauralFrequencies } from './binaural';

const AUDIO_FILES: Record<SoundId, string> = {
  restore: '/audio/restore-relax.mp3',
  arrive: '/audio/arrive-relax.mp3',
  downshift: '/audio/downshift-relax.mp3',
};

const outputVolume = (volume: number) => Math.max(0, Math.min(1, volume / 100));

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private soundId: SoundId = 'arrive';
  private volume = 58;
  private binauralPreset: BinauralPresetId = 'off';
  private context: AudioContext | null = null;
  private tones: [OscillatorNode, OscillatorNode] | null = null;
  private binauralGain: GainNode | null = null;
  private pauseTimer: number | null = null;
  private resolvePause: (() => void) | null = null;

  private ramp(param: AudioParam, target: number, duration: number) {
    const now = this.context!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + duration);
  }

  private buildBinaural() {
    if (this.context) return;
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    const context = new Constructor();
    const left = context.createOscillator();
    const right = context.createOscillator();
    const merger = context.createChannelMerger(2);
    const gain = context.createGain();
    gain.gain.value = 0;
    left.type = 'sine';
    right.type = 'sine';
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    merger.connect(gain);
    gain.connect(context.destination);
    left.start();
    right.start();
    this.context = context;
    this.tones = [left, right];
    this.binauralGain = gain;
  }

  private applyBinaural() {
    if (!this.context || !this.tones || !this.binauralGain) return;
    if (this.binauralPreset === 'off') {
      this.ramp(this.binauralGain.gain, 0, 0.35);
      return;
    }
    const { leftHz, rightHz } = binauralFrequencies(BINAURAL_PRESETS[this.binauralPreset]);
    const now = this.context.currentTime;
    this.tones[0].frequency.setTargetAtTime(leftHz, now, 0.12);
    this.tones[1].frequency.setTargetAtTime(rightHz, now, 0.12);
    this.ramp(this.binauralGain.gain, 0.045 * outputVolume(this.volume), 0.65);
  }

  private cancelPause() {
    if (this.pauseTimer !== null) window.clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    this.resolvePause?.();
    this.resolvePause = null;
  }

  get supported() {
    return typeof window !== 'undefined' && typeof window.Audio === 'function';
  }

  private build(soundId: SoundId) {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.loop = true;
    }
    const nextSource = new URL(AUDIO_FILES[soundId], window.location.origin).href;
    if (this.soundId !== soundId || this.audio.src !== nextSource) {
      this.soundId = soundId;
      this.audio.src = AUDIO_FILES[soundId];
      this.audio.load();
    }
    this.audio.volume = outputVolume(this.volume);
  }

  setSound(soundId: SoundId) {
    const wasPlaying = Boolean(this.audio && !this.audio.paused);
    this.build(soundId);
    if (wasPlaying) void this.audio?.play();
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.audio) this.audio.volume = outputVolume(volume);
    if (this.context && this.binauralGain && this.binauralPreset !== 'off') {
      this.ramp(this.binauralGain.gain, 0.045 * outputVolume(volume), 0.18);
    }
  }

  setBinaural(presetId: BinauralPresetId) {
    this.binauralPreset = presetId;
    if (!this.audio || this.audio.paused) return;
    if (presetId !== 'off') this.buildBinaural();
    this.applyBinaural();
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  async play(soundId = this.soundId, volume = this.volume, binauralPreset: BinauralPresetId = this.binauralPreset) {
    if (!this.supported) return false;
    this.cancelPause();
    this.volume = volume;
    this.binauralPreset = binauralPreset;
    this.build(soundId);
    try {
      if (binauralPreset !== 'off') {
        this.buildBinaural();
        this.applyBinaural();
        if (this.context?.state === 'suspended') await this.context.resume();
      } else {
        this.applyBinaural();
      }
      await this.audio?.play();
      return true;
    } catch {
      if (this.context?.state === 'running') await this.context.suspend();
      return false;
    }
  }

  async pause(seconds = 0.35) {
    if (!this.audio) return;
    this.cancelPause();
    if (this.context && this.binauralGain) this.ramp(this.binauralGain.gain, 0, Math.max(0, seconds));
    if (seconds <= 0) {
      this.audio.pause();
      if (this.context?.state === 'running') await this.context.suspend();
      return;
    }
    const audio = this.audio;
    await new Promise<void>((resolve) => {
      this.resolvePause = resolve;
      this.pauseTimer = window.setTimeout(() => {
        audio.pause();
        if (this.context?.state === 'running') void this.context.suspend();
        this.pauseTimer = null;
        this.resolvePause = null;
        resolve();
      }, seconds * 1000);
    });
  }

  async complete(_cue: CompletionCue, fadeSeconds: number, keepPlaying: boolean) {
    if (!keepPlaying) await this.pause(fadeSeconds);
  }

  dispose() {
    this.cancelPause();
    this.audio?.pause();
    this.audio?.removeAttribute('src');
    this.audio?.load();
    this.audio = null;
    this.tones?.forEach((tone) => tone.stop());
    if (this.context) void this.context.close();
    this.context = null;
    this.tones = null;
    this.binauralGain = null;
  }
}
