import { Headphones } from 'lucide-react';
import { BINAURAL_PRESETS } from '../audio/binaural';
import type { BinauralPresetId } from '../types';

interface BinauralStatusProps {
  presetId: BinauralPresetId;
  playing: boolean;
}

export function BinauralStatus({ presetId, playing }: BinauralStatusProps) {
  if (presetId === 'off') return null;

  const preset = BINAURAL_PRESETS[presetId];
  const label = `${preset.name} · ${preset.beatHz} Hz`;

  return (
    <div
      className={`binaural-status ${playing ? 'is-active' : ''}`}
      role="status"
      aria-label={`Binaural layer selected: ${preset.beatHz} Hz ${preset.name}-style beat`}
    >
      <Headphones size={13} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
