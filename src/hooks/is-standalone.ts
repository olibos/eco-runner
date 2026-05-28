import { useSyncExternalStore } from 'react';

const mql = window.matchMedia('(display-mode: standalone)');

function getSnapshot() {
    return mql.matches;
}

function subscribe(callback: () => void) {
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
}

export function useIsStandalone() {
    return useSyncExternalStore(subscribe, getSnapshot);
}