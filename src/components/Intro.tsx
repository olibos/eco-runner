import clsx from 'clsx';
import Classes from './Intro.module.scss';
import { useEffect } from 'react';

type Props = {
    onClose(): void;
}

export function Intro({ onClose }: Props) {
    useEffect(() => {
        const controller = new AbortController();
        const handle = async () => {
            if (controller.signal.aborted) return;
            controller.abort();
            onClose();
            await document.body.requestFullscreen().catch(console.warn);
        };
        window.addEventListener('keypress', handle, { signal: controller.signal });
        window.addEventListener('click', handle, { signal: controller.signal });
        return () => controller.abort();
    }, []);
    return (
        <section className={clsx(Classes.intro)}>
            <div className={clsx(Classes.corner, Classes['corner--tl'])}></div>
            <div className={clsx(Classes.corner, Classes['corner--tr'])}></div>
            <div className={clsx(Classes.corner, Classes['corner--bl'])}></div>
            <div className={clsx(Classes.corner, Classes['corner--br'])}></div>

            <div className={clsx(Classes.stage)}>
                <div className={clsx(Classes.logo)} data-label="ECO-RUNNER">ECO-RUNNER</div>
                <div className={clsx(Classes.divider)}></div>
                <div className={clsx(Classes['press-start'])}>PRESS START</div>
            </div>
        </section>
    );
}