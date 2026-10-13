import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BinauralStatus } from './BinauralStatus';

describe('BinauralStatus', () => {
  it('stays hidden when the binaural layer is off', () => {
    render(<BinauralStatus presetId="off" playing={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the selected profile separately from the soundscape', () => {
    render(<BinauralStatus presetId="alpha" playing />);
    expect(screen.getByRole('status', { name: 'Binaural layer selected: 10 Hz Alpha-style beat' })).toHaveTextContent('Alpha · 10 Hz');
  });
});
