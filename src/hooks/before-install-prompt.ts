import { useSyncExternalStore } from "react";

// 1. External state: cache it at the module level so it's captured immediately
let promptFn: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

function dispatch() {
    listeners.forEach((listener) => listener());
}
// Attach the listener once, outside of any component
if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        
        // Save the prompt function globally
        promptFn = async () => {
            await e.prompt().catch(console.error);
            promptFn = null;
            dispatch();
        }
        
        // Notify all hooked components that the prompt is ready
        dispatch();
    });
}

// 2. Setup the store subscription patterns
function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function getSnapshot() {
    return promptFn;
}

// 3. The Hook
export function useBeforeInstallPrompt() {
    return useSyncExternalStore(
        subscribe, 
        getSnapshot, 
        getSnapshot // For SSR environments
    );
}