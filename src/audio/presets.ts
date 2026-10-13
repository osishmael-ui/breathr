import type { SoundId, SoundPreset } from '../types';

export const SOUND_PRESETS: Record<SoundId, SoundPreset> = {
  restore: {
    id: 'restore', name: 'Restore', eyebrow: 'Soft landing',
    description: 'A gentle sound bed for arriving in the room and letting your shoulders drop.',
    warmth: '#73b9e6',
  },
  arrive: {
    id: 'arrive', name: 'Arrive', eyebrow: 'Steady current',
    description: 'A grounded track for settling into an even, comfortable breath.',
    warmth: '#61addb',
  },
  downshift: {
    id: 'downshift', name: 'Downshift', eyebrow: 'Deep release',
    description: 'A slower, spacious track to accompany longer exhales and a quieter mind.',
    warmth: '#9bd2ef',
  },
};

export const SOUND_IDS = Object.keys(SOUND_PRESETS) as SoundId[];
