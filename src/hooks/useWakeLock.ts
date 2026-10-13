import { useEffect, useState } from 'react';

export function useWakeLock(enabled: boolean) {
  const supported = 'wakeLock' in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const release = async () => {
      if (sentinel && !sentinel.released) await sentinel.release().catch(() => undefined);
      sentinel = null;
      if (!cancelled) setActive(false);
    };

    const acquire = async () => {
      if (!enabled || !supported || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (!cancelled) setActive(true);
        sentinel.addEventListener('release', () => { if (!cancelled) setActive(false); });
      } catch {
        if (!cancelled) setActive(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
      else void release();
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void release();
    };
  }, [enabled, supported]);

  return { supported, active };
}
