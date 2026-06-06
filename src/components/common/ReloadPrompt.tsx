import { useRegisterSW } from 'virtual:pwa-register/react'

import Styles from './ReloadPrompt.module.scss'


export function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW: (_, sw) => sw?.update(),
    });

    if (!needRefresh) return null;

    return (
        <div className={Styles.toast}>
            <div className={Styles.message}>
                <span>Nouvelle version disponible !</span>
            </div>
            <div className={Styles.buttons}>
                <button className={Styles.button} onClick={() => updateServiceWorker(true)}>Recharger</button>
                <button className={Styles.button} onClick={() => setNeedRefresh(false)}>Fermer</button>
            </div>
        </div>
    )
}
