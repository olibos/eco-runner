import { useEffect } from "react";

let wakeLock: WakeLockSentinel | null = null;
let lockCount = 0;

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;

    if (lockCount > 0 && (!wakeLock || wakeLock.released)) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.info('Wake Lock acquired:', wakeLock);
            wakeLock.addEventListener(
                'release',
                () => {
                    wakeLock = null;
                    console.info('Wake Lock released');
                },
                { once: true });
        } catch (err) {
            console.warn('Wake Lock request failed:', err);
        }
    }
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

export function useScreenWakeLock() {
    useEffect(() => {
        if (!('wakeLock' in navigator)) return;

        lockCount++;
        requestWakeLock();

        return () => {
            lockCount--;

            if (lockCount <= 0) {
                const currentLock = wakeLock;
                wakeLock = null;
                currentLock?.release().catch(console.warn);
            }
        };
    }, []);
}