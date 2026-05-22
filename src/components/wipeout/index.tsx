import { useEffect, useRef } from 'react';
import {Wipeout} from './Wipeout';
export default function () {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const viewer = new Wipeout(container.current, window.innerWidth, window.innerHeight)
        viewer.load();

        return () => viewer.dispose();
    }, []);
    return (
        <div ref={container}></div>
    );
}