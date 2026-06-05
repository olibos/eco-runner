import { useEffect, useRef, type DialogHTMLAttributes, type KeyboardEvent, type ReactEventHandler, type Ref, type SyntheticEvent } from 'react'
import styles from './Dialog.module.scss'
import clsx from 'clsx'
import { useMenu } from '../../hooks/menu';


export type DialogProps = DialogHTMLAttributes<HTMLDialogElement> & {
    autoScroll?: boolean;
    showCloseButton?: boolean;
    disableMenuContext?: boolean;
    onHelp?(): void;
    onClose?(): void;
}

export function Dialog({
    className,
    autoScroll,
    children,
    onClose,
    onHelp,
    showCloseButton = true,
    disableMenuContext,
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

    function handleClose() {
        if (!disableMenuContext && close) close();
        onClose?.();
    }

    function stopPropagation(e: SyntheticEvent) {
        e.stopPropagation();
    }

    useEffect(() => {
        const controller = new AbortController();
        addEventListener('click', () => handleClose(), { signal: controller.signal });
        addEventListener('keydown', e => {
            const event = e as unknown as KeyboardEvent;
            if (event.key === 'Escape' || event.key === 'Enter') {
                e.preventDefault();
                handleClose();
            }
        }, { signal: controller.signal });
        return () => {
            controller.abort();
        };
    }, []);

    return (
        <dialog className={clsx(styles.dialog, className)} {...dialogProps} onClose={handleClose} onClick={stopPropagation}>
            <form method="dialog" className={styles.form} ref={contentRef}>
                {(onHelp || showCloseButton) && (
                    <div className={styles.buttons}>
                        {onHelp && (
                            <button type="button" title="Help" onClick={onHelp}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </button>
                        )}
                        {showCloseButton && (
                            <button title="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                {children}
            </form>
        </dialog>
    )
}