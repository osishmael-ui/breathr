export const PWA_UPDATE_EVENT = 'breathr:pwa-update';

export interface PwaUpdateDetail {
  apply: () => void;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  let refreshing = false;

  const announceUpdate = () => {
    if (!registration.waiting) return;
    window.dispatchEvent(new CustomEvent<PwaUpdateDetail>(PWA_UPDATE_EVENT, {
      detail: {
        apply: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }),
      },
    }));
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  if (registration.waiting) announceUpdate();

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    installingWorker?.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        announceUpdate();
      }
    });
  });

  // Update checks are best-effort: an installed app may start without a network.
  void registration.update().catch(() => undefined);
}
