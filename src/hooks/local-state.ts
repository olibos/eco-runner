import { useState } from "react";

export function useLocalState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
    const [state, setState] = useState<T>(() => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) as T : defaultValue;
    });

    const setLocalState = (value: T) => {
        setState(value);
        localStorage.setItem(key, JSON.stringify(value));
    };

    return [state, setLocalState];
}