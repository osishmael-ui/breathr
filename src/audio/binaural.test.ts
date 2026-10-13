import { describe, expect, it } from 'vitest';
import { BINAURAL_PRESETS, BINAURAL_PRESET_IDS, binauralFrequencies, binauralLabel } from './binaural';

describe('binaural presets', () => {
  it('uses symmetric stereo frequencies for every named beat', () => {
    BINAURAL_PRESET_IDS.forEach((presetId) => {
      const preset = BINAURAL_PRESETS[presetId];
      const { leftHz, rightHz } = binauralFrequencies(preset);

      expect(rightHz - leftHz).toBe(preset.beatHz);
      expect((leftHz + rightHz) / 2).toBe(preset.carrierHz);
    });
  });

  it('describes profiles without outcome claims', () => {
    expect(binauralLabel(BINAURAL_PRESETS.alpha)).toBe('10 Hz Alpha-style beat');
  });
});
