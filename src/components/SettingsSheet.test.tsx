import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayer } from '../hooks/usePlayer';
import { SettingsSheet } from './SettingsSheet';

function Settings() {
  const player = usePlayer();
  return <SettingsSheet open shortcutsHighlighted={false} player={player} onClose={() => {}} />;
}

describe('binaural settings', () => {
  beforeEach(() => localStorage.clear());

  it('explains stereo listening and updates the description for each selection', () => {
    render(<Settings />);
    const selector = screen.getByLabelText('Beat profile');
    expect(screen.getByText(/slightly different tone to each ear/)).toBeInTheDocument();
    expect(screen.getByText(/Use stereo headphones/)).toBeInTheDocument();
    expect(selector).toHaveAccessibleDescription('Off by default. Choose a profile to add the binaural layer.');

    for (const [preset, frequency] of [['delta', 2], ['theta', 6], ['alpha', 10], ['beta', 16], ['gamma', 40]] as const) {
      fireEvent.change(selector, { target: { value: preset } });
      expect(selector).toHaveAccessibleDescription(new RegExp(`${frequency} Hz is the difference between the left and right tones`));
      expect(selector).toHaveAccessibleDescription(/No particular effect is guaranteed/);
    }
    fireEvent.change(selector, { target: { value: 'off' } });
    expect(selector).toHaveAccessibleDescription(/Off by default/);
  });
});
