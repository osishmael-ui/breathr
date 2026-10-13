import type { BinauralPresetId, CompletionCue, SoundId } from '../types';

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
  }

  setBinaural(_presetId: BinauralPresetId) {
    // Breathr uses the 2ndBell recordings directly. Keep this compatible with
    // the shared settings surface without adding synthetic audio layers.
  }

  async play(soundId = this.soundId, volume = this.volume, _binauralPreset: BinauralPresetId = 'off') {
    if (!this.supported) return false;
    this.volume = volume;
    this.build(soundId);
    try {
      await this.audio?.play();
      return true;
    } catch {
      return false;
    }
  }

  async pause(seconds = 0.35) {
    if (!this.audio) return;
    if (seconds <= 0) {
      this.audio.pause();
      return;
    }
    const audio = this.audio;
    await new Promise<void>((resolve) => window.setTimeout(resolve, seconds * 1000));
    audio.pause();
  }

  async complete(_cue: CompletionCue, fadeSeconds: number, keepPlaying: boolean) {
    if (!keepPlaying) await this.pause(fadeSeconds);
  }

  dispose() {
    this.audio?.pause();
    this.audio?.removeAttribute('src');
    this.audio?.load();
    this.audio = null;
  }
}
