import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './engine';

const created = vi.hoisted(() => ({ contexts: [] as MockContext[], audio: [] as MockAudio[] }));

class MockParam {
  value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
}
class MockNode { connect = vi.fn(); }
class MockOscillator extends MockNode { type = ''; frequency = new MockParam(); start = vi.fn(); stop = vi.fn(); }
class MockContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = new MockNode();
  oscillators: MockOscillator[] = [];
  gain = Object.assign(new MockNode(), { gain: new MockParam() });
  constructor() { created.contexts.push(this); }
  createOscillator() { const oscillator = new MockOscillator(); this.oscillators.push(oscillator); return oscillator; }
  createChannelMerger = vi.fn(() => new MockNode());
  createGain = vi.fn(() => this.gain);
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}
class MockAudio {
  preload = ''; loop = false; src = ''; volume = 1; paused = true;
  constructor() { created.audio.push(this); }
  load = vi.fn();
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn();
}

describe('Breathr binaural layer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    created.contexts.length = 0;
    created.audio.length = 0;
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', MockContext);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('leaves default playback alone and creates a stereo layer when selected', async () => {
    const engine = new AudioEngine();
    await engine.play('arrive', 58, 'off');
    expect(created.contexts).toHaveLength(0);
    expect(created.audio[0].volume).toBe(0.58);
    engine.setBinaural('alpha');
    const context = created.contexts[0];
    expect(context.createChannelMerger).toHaveBeenCalledWith(2);
    expect(context.oscillators[0].connect).toHaveBeenCalledWith(expect.anything(), 0, 0);
    expect(context.oscillators[1].connect).toHaveBeenCalledWith(expect.anything(), 0, 1);
    expect(context.oscillators[0].frequency.setTargetAtTime).toHaveBeenLastCalledWith(215, 0, 0.12);
    expect(context.oscillators[1].frequency.setTargetAtTime).toHaveBeenLastCalledWith(225, 0, 0.12);
    engine.setBinaural('gamma');
    expect(context.oscillators[0].frequency.setTargetAtTime).toHaveBeenLastCalledWith(200, 0, 0.12);
    expect(context.oscillators[1].frequency.setTargetAtTime).toHaveBeenLastCalledWith(240, 0, 0.12);
    engine.setVolume(30);
    expect(created.audio[0].volume).toBe(0.3);
    expect(context.gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.045 * 0.3, 0.18);
    engine.setBinaural('off');
    expect(context.gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.35);
    engine.dispose();
    expect(context.close).toHaveBeenCalled();
  });

  it('resumes the selected layer and cancels an interrupted pause', async () => {
    const engine = new AudioEngine();
    await engine.play('arrive', 58, 'theta');
    const context = created.contexts[0];
    const pendingPause = engine.pause(1);
    await engine.play('arrive', 58, 'theta');
    await pendingPause;
    vi.advanceTimersByTime(1100);
    expect(created.audio[0].pause).not.toHaveBeenCalled();
    expect(context.suspend).not.toHaveBeenCalled();
    await engine.pause(0);
    expect(context.suspend).toHaveBeenCalled();
    await engine.play('arrive', 58, 'theta');
    expect(context.resume).toHaveBeenCalled();
    engine.dispose();
  });
});
