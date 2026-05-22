import { createContext, useContext } from "react";
import { useLocalState } from "./local-state";
import bgOpus from '../assets/background.opus.webm?url'
import bgVorbis from '../assets/background.vorbis.webm?url'

type SoundContext = {
    play(): void;
    stop(): void;
    autoPlay(): void;
    toggle(): void;
    isPlaying(): boolean;
}
const context = createContext<SoundContext | undefined>(undefined);

            
const audio = new Audio()
audio.loop = true
const canPlayOpus = audio.canPlayType('audio/webm; codecs=opus')
audio.src = canPlayOpus ? bgOpus : bgVorbis

export function BackgroundSoundProvider({ children }: { children: React.ReactNode }) {
    const [playSound, setPlaySound] = useLocalState('play-sound', true);
    
    function play() {
        audio.play().catch(() => {
            document.addEventListener('click', () => audio.play(), { once: true })
        })
        setPlaySound(true);
    }
    
    function stop() {
        audio.pause();
        audio.currentTime = 0;
        setPlaySound(false);
    }
    function autoPlay() {
        if (playSound) play();
    }
    function toggle() {
        if (playSound) {
            stop();
        } else {
            play();
        }
    }

    function isPlaying(){
        return !audio.paused && !audio.ended && audio.readyState > 2
    }
    return (
        <context.Provider value={{ play, stop, autoPlay, toggle, isPlaying }}>
            {children}
        </context.Provider>
    );
}

export const useBackgroundSound = () => {
    const ctx = useContext(context);
    if (!ctx) throw new Error('useBackgroundSound must be used within a SoundProvider');
    return ctx;
}