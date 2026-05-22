import { useBackgroundSound } from '../../hooks/background-sound'
import { MenuProvider } from '../../hooks/menu'
import { Avatar } from '../game/Avatar'
import styles from './MainMenu.module.scss'
import { type Props as MenuItemProps, MenuItem } from './MenuItem'
import { type KeyboardEvent, type ReactElement, type ReactNode, Children, useMemo, useState } from 'react'

type Props = {
    children: ReactNode;
}

type MenuItem = {
    label?: string;
    key: string | number;
    isSeparator?: boolean;
    disabled?: boolean;
    children?: ReactNode;
    onClick?(): void;
}
export function MainMenu({ children }: Props) {
    const { toggle, isPlaying } = useBackgroundSound();
    const [selected, setSelected] = useState<string | number>();
    const items = useMemo(() => Children.map(children as ReactElement<MenuItemProps>, (c, i): MenuItem | null => {
        if (!c) return null;
        if (!('label' in c.props)) return { isSeparator: true, key: i };

        return {
            label: c.props.label,
            key: c.key ?? i,
            children: c.props.children,
            disabled: c.props.disabled,
            onClick: c.props.onClick,
        };
    }), [children]);
    const firstItem = items.find(i => !i.disabled && !i.isSeparator);
    const control = items.find(item => item.key === selected);
    control?.onClick?.();
    if (control && control.children) {
        return <MenuProvider onClose={() => setSelected(undefined)}>{control.children}</MenuProvider>;
    }

    function handleArrowNavigation(e: KeyboardEvent) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        let index = buttons.findIndex(btn => btn === document.activeElement);
        if (index === -1) return;
        index = (index + (e.key === 'ArrowDown' ? 1 : -1)) % buttons.length;
        buttons.at(index)?.focus();
    }
    return (
        <nav className={styles.menu} aria-label="Main menu">
            <div className={styles.panel}>
                <Avatar />
                <button
                    type="button"
                    className={styles.soundToggle}
                    onClick={toggle}
                    aria-label={isPlaying() ? 'Mute sound' : 'Unmute sound'}
                    title={isPlaying() ? 'Mute sound' : 'Unmute sound'}
                >
                    {isPlaying() ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M11 5L6 9H3V15H6L11 19V5Z" />
                            <path d="M15 9L21 15" />
                            <path d="M21 9L15 15" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M11 5L6 9H3V15H6L11 19V5Z" />
                            <path d="M15 9C16.8 10.6 16.8 13.4 15 15" />
                            <path d="M18 7C21.2 9.8 21.2 14.2 18 17" />
                        </svg>
                    )}
                </button>
                <header className={styles.header}>
                    <span className={styles.kana}>主目錄</span>
                    <h1 className={styles.title}>ECO-Runner</h1>
                </header>
                <ul className={styles.list} onKeyDown={handleArrowNavigation}>
                    {items.map(({ label, key, isSeparator, disabled }, index) => (
                        <li key={key} className={styles.item}>
                            {isSeparator ? (
                                <hr className={styles.separator} />
                            ) : (
                                <button
                                    type="button"
                                    className={styles.button}
                                    autoFocus={firstItem?.key === key}
                                    disabled={disabled}
                                    onClick={(e)=>{e.stopPropagation(); setSelected(key);}}
                                >
                                    {label}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    )
}