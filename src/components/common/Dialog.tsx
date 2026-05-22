import { useEffect, useRef, type DialogHTMLAttributes, type KeyboardEvent, type ReactEventHandler, type Ref, type SyntheticEvent } from 'react'
import styles from './Dialog.module.scss'
import clsx from 'clsx'
import { useMenu } from '../../hooks/menu';


export type DialogProps = DialogHTMLAttributes<HTMLDialogElement> & {
    autoScroll?: boolean;
}

export function Dialog({
    className,
    open,
    autoScroll,
    children,
    onClose,
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
            if (event.key === 'Escape') {
                e.preventDefault();
                close?.();
            }
        }, { signal: controller.signal });
        return () => {
            controller.abort();
        };
    }, []);

    return (
        <dialog className={clsx(styles.dialog, className)} open={open} {...dialogProps} onClose={handleClose} onClick={stopPropagation}>
            <form method="dialog" className={styles.form} ref={contentRef}>
                {children}
            </form>
        </dialog>
    )
}