import { useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export type OfflineState = 'unsupported' | 'installing' | 'ready' | 'update';

/**
 * Registers the service worker (production builds only). A new version waits until the person chooses to
 * reload, so an open plan is never swapped out underneath them.
 */
export function useServiceWorker(): { state: OfflineState; applyUpdate: () => void } {
  const [state, setState] = useState<OfflineState>('unsupported');
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    setState('installing');
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        const track = (worker: ServiceWorker | null) => {
          if (!worker) return;
          const check = () => {
            if (cancelled) return;
            if (worker.state === 'installed') {
              if (navigator.serviceWorker.controller && hadController) {
                setWaiting(worker);
                setState('update');
              }
            }
            if (worker.state === 'activated' && !hadController) setState('ready');
          };
          worker.addEventListener('statechange', check);
          check();
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaiting(reg.waiting);
          setState('update');
        } else if (reg.active) {
          setState('ready');
        }
        track(reg.installing);
        reg.addEventListener('updatefound', () => track(reg.installing));
      })
      .catch(() => !cancelled && setState('unsupported'));
    const onController = () => {
      if (hadController) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onController);
    };
  }, []);

  return {
    state,
    applyUpdate: () => waiting?.postMessage({ type: 'SKIP_WAITING' }),
  };
}
