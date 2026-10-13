import type { BinauralPresetId } from '../types';

export interface BinauralPreset {
  id: Exclude<BinauralPresetId, 'off'>;
  name: string;
  beatHz: number;
  carrierHz: number;
}

export const BINAURAL_PRESETS: Record<Exclude<BinauralPresetId, 'off'>, BinauralPreset> = {
  delta: { id: 'delta', name: 'Delta', beatHz: 2, carrierHz: 220 },
  theta: { id: 'theta', name: 'Theta', beatHz: 6, carrierHz: 220 },
  alpha: { id: 'alpha', name: 'Alpha', beatHz: 10, carrierHz: 220 },
  beta: { id: 'beta', name: 'Beta', beatHz: 16, carrierHz: 220 },
  gamma: { id: 'gamma', name: 'Gamma', beatHz: 40, carrierHz: 220 },
};

export const BINAURAL_PRESET_IDS = Object.keys(BINAURAL_PRESETS) as Array<Exclude<BinauralPresetId, 'off'>>;

export function binauralFrequencies(preset: BinauralPreset) {
  return {
    leftHz: preset.carrierHz - preset.beatHz / 2,
    rightHz: preset.carrierHz + preset.beatHz / 2,
  };
}

export function binauralLabel(preset: BinauralPreset) {
  return `${preset.beatHz} Hz ${preset.name}-style beat`;
}
