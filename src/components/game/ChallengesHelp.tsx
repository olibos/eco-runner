import { Dialog } from '../common/Dialog';
import styles from './ChallengesHelp.module.scss';

export function ChallengesHelp({ onClose }: { onClose: () => void }) {
    return (
        <Dialog open disableMenuContext onClose={onClose}>
            <div className={styles.header}>
                <span className={styles.tag}>MANUEL DU PILOTE</span>
                <h2 className={styles.title}>PROTOCOLE ECO-RUNNER</h2>
            </div>

            <div className={styles.body}>
                <section className={styles.section}>
                    <h3 className={styles.h3}>⚡ GÉNÉRATION DE POINTS</h3>
                    <p>Optimisez votre trajectoire énergétique pour grimper au classement :</p>
                    <ul className={styles.list}>
                        <li><strong>Baseline (Consommation vs 3 mois) :</strong><br />Réduisez votre consommation (L/100 km) par rapport à votre moyenne historique.<br />De <strong>10 pts</strong> (-1%) jusqu'à <strong>150 pts</strong> (-10%).</li>
                        <li><strong>Tendance :</strong><br />Gagnez un bonus si vous faites mieux que le mois dernier.<br />Jusqu'à <strong>75 pts</strong> supplémentaires.</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.h3}>🔥 BONNUS MULTIPLICATEUR</h3>
                    <p>La régularité est la clé de la domination. Restez sous votre baseline plusieurs mois consécutifs :</p>
                    <div className={styles.multipliers}>
                        <span>2 mois: <strong>x1.20</strong></span>
                        <span>3 mois: <strong>x1.50</strong></span>
                        <span>4+ mois: <strong>x1.75</strong></span>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.h3}>🏆 BADGES</h3>
                    <p>Débloquez des badges allant de <em>Premier Geste</em> jusqu'au titre de <em>Champion</em> !</p>
                </section>
            </div>

            <button className="dialog-button">Close</button>
        </Dialog>
    );
}
