import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock', () => {
  it('acquires and releases a supported screen lock', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const sentinel = new EventTarget() as WakeLockSentinel;
    Object.defineProperties(sentinel, { released: { value: false }, release: { value: release } });
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    const { result, unmount } = renderHook(() => useWakeLock(true));
    await act(async () => Promise.resolve());
    expect(result.current.supported).toBe(true);
    expect(request).toHaveBeenCalledWith('screen');
    unmount();
    expect(release).toHaveBeenCalled();
  });
});
