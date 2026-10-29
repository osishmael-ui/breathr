import { AudioEngine } from '../../src/audio/engine';
import type { BinauralPresetId, SoundId } from '../../src/types';

const sampleRate = 48000;
const recordings: Record<SoundId, string> = { arrive: '/audio/arrive-relax.mp3', restore: '/audio/restore-relax.mp3', downshift: '/audio/downshift-relax.mp3' };
const decoded = new Map<SoundId, AudioBuffer>();
type Options = { sound: SoundId; preset: BinauralPresetId; volume?: number; change?: { at: number; preset: BinauralPresetId } };

// Render the production graph unchanged. A proxy only adapts the constructor and
// state to OfflineAudioContext; all nodes and automation are the browser's own.
export async function render({ sound, preset, volume = 58, change }: Options) {
  const original = window.AudioContext;
  const originalAudio = window.Audio;
  const random = Math.random;
  let seed = 123456;
  Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const offline = new OfflineAudioContext(2, sampleRate * 6, sampleRate);
  if (!decoded.has(sound)) {
    const bytes = await (await fetch(recordings[sound])).arrayBuffer();
    decoded.set(sound, await offline.decodeAudioData(bytes));
  }
  const recording = offline.createBufferSource();
  recording.buffer = decoded.get(sound)!;
  recording.loop = true;
  const recordingGain = offline.createGain();
  recording.connect(recordingGain);
  recordingGain.connect(offline.destination);
  class OfflineRecording {
    preload = ''; loop = false; src = ''; paused = true;
    set volume(value: number) { recordingGain.gain.value = value; }
    load() {}
    async play() { this.paused = false; recording.start(); }
    pause() { this.paused = true; }
    removeAttribute() {}
  }
  window.Audio = OfflineRecording as unknown as typeof Audio;
  const proxy = new Proxy(offline, {
    get(target, property) {
      if (property === 'state') return 'running';
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  window.AudioContext = class { constructor() { return proxy as unknown as AudioContext; } } as unknown as typeof AudioContext;
  const engine = new AudioEngine();
  try {
    await engine.play(sound, volume, preset);
    const suspended = change ? offline.suspend(change.at) : null;
    const rendering = offline.startRendering();
    if (suspended && change) {
      await suspended;
      engine.setBinaural(change.preset);
      await offline.resume();
    }
    const buffer = await rendering;
    return [buffer.getChannelData(0), buffer.getChannelData(1)];
  } finally {
    window.AudioContext = original;
    window.Audio = originalAudio;
    Math.random = random;
  }
}

function amplitude(data: Float32Array, hz: number, start = 3, duration = 2) {
  let re = 0, im = 0;
  const first = start * sampleRate, count = duration * sampleRate;
  for (let i = 0; i < count; i++) {
    const angle = 2 * Math.PI * hz * i / sampleRate;
    re += data[first + i] * Math.cos(angle);
    im -= data[first + i] * Math.sin(angle);
  }
  return 2 * Math.hypot(re, im) / count;
}

function rms(data: Float32Array) {
  let sum = 0;
  for (let i = 3 * sampleRate; i < 5 * sampleRate; i++) sum += data[i] ** 2;
  return Math.sqrt(sum / (2 * sampleRate));
}

function difference(a: Float32Array[], b: Float32Array[]) {
  return a.map((channel, c) => Float32Array.from(channel, (value, i) => value - b[c][i]));
}

export async function verify() {
  const expected = { delta: [219, 221], theta: [217, 223], alpha: [215, 225], beta: [212, 228], gamma: [200, 240] } as const;
  const sounds: SoundId[] = ['arrive', 'restore', 'downshift'];
  const results: Record<string, unknown> = {};
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  for (const [preset, frequencies] of Object.entries(expected)) {
    const ambient = await render({ sound: 'arrive', preset: 'off' });
    const mix = await render({ sound: 'arrive', preset: preset as BinauralPresetId });
    const signal = difference(mix, ambient);
    const peaks = signal.map((channel, c) => {
      let best = 0, bestHz = 0;
      for (let hz = 190; hz <= 250; hz += 0.5) {
        const value = amplitude(channel, hz);
        if (value > best) { best = value; bestHz = hz; }
      }
      const leaked = amplitude(channel, frequencies[1 - c]);
      assert(Math.abs(bestHz - frequencies[c]) <= 0.5, `${preset} channel ${c}: peak ${bestHz}`);
      assert(leaked < best * 0.01, `${preset} channel ${c}: leakage ${leaked / best}`);
      return { hz: bestHz, amplitude: best, crossChannelRatio: leaked / best };
    });
    results[preset] = peaks;
  }
  const switching = await render({ sound: 'arrive', preset: 'alpha', change: { at: 2, preset: 'gamma' } });
  const off = await render({ sound: 'arrive', preset: 'off' });
  const switched = difference(switching, off);
  assert(amplitude(switched[0], 200) > amplitude(switched[0], 215) * 10, 'switch to gamma left');
  assert(amplitude(switched[1], 240) > amplitude(switched[1], 225) * 10, 'switch to gamma right');
  const disabled = difference(await render({ sound: 'arrive', preset: 'alpha', change: { at: 2, preset: 'off' } }), off);
  assert(rms(disabled[0]) < 1e-6 && rms(disabled[1]) < 1e-6, 'off must silence binaural layer');
  const low = difference(await render({ sound: 'arrive', preset: 'alpha', volume: 25 }), await render({ sound: 'arrive', preset: 'off', volume: 25 }));
  const high = difference(await render({ sound: 'arrive', preset: 'alpha', volume: 50 }), await render({ sound: 'arrive', preset: 'off', volume: 50 }));
  assert(Math.abs(rms(high[0]) / rms(low[0]) - 2) < 0.01, 'volume must scale binaural audio');
  const muted = await render({ sound: 'arrive', preset: 'alpha', volume: 0 });
  assert(rms(muted[0]) < 1e-8 && rms(muted[1]) < 1e-8, 'zero volume must silence output');
  const mixing: Record<string, unknown> = {};
  for (const sound of sounds) {
    const background = await render({ sound, preset: 'off' });
    for (const [preset, frequencies] of Object.entries(expected)) {
      const mix = await render({ sound, preset: preset as BinauralPresetId });
      const signal = difference(mix, background);
      const backgroundRms = rms(background[0]);
      const signalRms = rms(signal[0]);
      assert(amplitude(signal[0], frequencies[0]) > 0.01 && amplitude(signal[1], frequencies[1]) > 0.01, `${sound}/${preset}: binaural missing`);
      if (preset === 'alpha') mixing[sound] = {
        backgroundRms, signalRms, relativeDb: 20 * Math.log10(signalRms / backgroundRms),
        leftCarrierBackground: amplitude(background[0], frequencies[0]),
        rightCarrierBackground: amplitude(background[1], frequencies[1]),
      };
    }
  }
  return { sampleRate, frequencies: results, switching: 'passed', off: 'passed', volume: 'passed', mixing };
}

Object.assign(window, { verifyAudio: verify });

let playback: AudioContext | undefined;
document.querySelector<HTMLButtonElement>('#stop')?.addEventListener('click', () => {
  void playback?.close();
  playback = undefined;
  document.querySelector<HTMLElement>('#status')!.textContent = 'Stopped.';
});
document.querySelector<HTMLButtonElement>('#play')?.addEventListener('click', async () => {
  const status = document.querySelector<HTMLElement>('#status')!;
  try {
    if (playback) await playback.close();
    playback = new AudioContext();
    await playback.resume();
    status.textContent = 'Rendering…';
    const sound = document.querySelector<HTMLSelectElement>('#sound')!.value as SoundId;
    const preset = document.querySelector<HTMLSelectElement>('#preset')!.value as BinauralPresetId;
    const mode = document.querySelector<HTMLSelectElement>('#mode')!.value;
    const mixed = await render({ sound, preset, volume: 25 });
    const ambient = await render({ sound, preset: 'off', volume: 25 });
    const signal = difference(mixed, ambient);
    const selected = mode === 'mixed' ? mixed : mode === 'ambient' ? ambient : signal;
    const buffer = playback.createBuffer(2, sampleRate * 4, sampleRate);
    for (let c = 0; c < 2; c++) {
      if ((mode === 'left' && c === 1) || (mode === 'right' && c === 0)) continue;
      buffer.copyToChannel(selected[c].subarray(sampleRate, sampleRate * 5), c);
    }
    const source = playback.createBufferSource();
    source.buffer = buffer;
    source.connect(playback.destination);
    source.start();
    status.textContent = 'Playing. Use Stop before changing settings.';
    source.onended = () => { status.textContent = 'Finished.'; };
  } catch (error) { status.textContent = `Error: ${String(error)}`; }
});
