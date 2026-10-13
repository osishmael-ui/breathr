import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('applies a selected theme and updates the browser color', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    renderHook(() => useTheme('mist'));
    expect(document.documentElement.dataset.theme).toBe('mist');
    expect(meta).toHaveAttribute('content', '#edf5f1');
    meta.remove();
  });
});
