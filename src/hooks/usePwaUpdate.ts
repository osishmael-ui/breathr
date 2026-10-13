import { useEffect, useState } from 'react';
import { PWA_UPDATE_EVENT, type PwaUpdateDetail } from '../pwa';

export function usePwaUpdate() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const { apply } = (event as CustomEvent<PwaUpdateDetail>).detail;
      setApplyUpdate(() => apply);
    };
    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate);
  }, []);

  return applyUpdate;
}
