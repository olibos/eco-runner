import { useEffect, useRef, type DialogHTMLAttributes, type KeyboardEvent, type ReactEventHandler, type Ref, type SyntheticEvent } from 'react'
import styles from './Dialog.module.scss'
import clsx from 'clsx'
import { useMenu } from '../../hooks/menu';


export type DialogProps = DialogHTMLAttributes<HTMLDialogElement> & {
    autoScroll?: boolean;
    showCloseButton?: boolean;
}

export function Dialog({
    className,
    autoScroll,
    children,
    onClose,
    showCloseButton = true,
    ...dialogProps
}: DialogProps) {
    const contentRef = useRef<HTMLFormElement>(null);
    const close = useMenu()?.close;

    useEffect(() => {
        const form = contentRef.current;

        if (!form || !autoScroll) return;

        const stickToBottom = () => {
            form.scrollTop = form.scrollHeight;
        };

        stickToBottom();

        const observer = new MutationObserver(() => {
            stickToBottom();
        });

        observer.observe(form, {
            subtree: true,
            childList: true,
            characterData: true,
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    function handleClose(e: SyntheticEvent<HTMLDialogElement>) {
        close?.();
        onClose?.(e);
    }

    function stopPropagation(e: SyntheticEvent) {
        e.stopPropagation();
    }

    useEffect(() => {
        const controller = new AbortController();
        addEventListener('click', () => close?.(), { signal: controller.signal });
        addEventListener('keydown', e => {
            const event = e as unknown as KeyboardEvent;
            if (event.key === 'Escape' || event.key === 'Enter') {
                e.preventDefault();
                close?.();
            }
        }, { signal: controller.signal });
        return () => {
            controller.abort();
        };
    }, []);

    return (
        <dialog className={clsx(styles.dialog, className)} {...dialogProps} onClose={handleClose} onClick={stopPropagation}>
            <form method="dialog" className={styles.form} ref={contentRef}>
                {showCloseButton && (
                    <button className={styles.closeButton} title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                )}
                {children}
            </form>
        </dialog>
    )
}