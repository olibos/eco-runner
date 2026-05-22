import clsx from "clsx";
import styles from "./LbRows.module.scss";

type LbEntry = {
	rank: number;
	name: string;
	score: number;
	trend: string;
	me?: boolean;
	av?: string;
};

export function LbRows({ entries }: { entries: LbEntry[] }) {
	const rankIcon = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : String(r));
	const rankClass = (r: number) => (r === 1 ? styles.isR1 : r === 2 ? styles.isR2 : r === 3 ? styles.isR3 : styles.isRn);

	return (
		<div className={styles.list} style={{ '--column-count': entries.length > 5 ? 2 : 1 } as React.CSSProperties}>
			{entries.map((p) => {
				const trendClass = p.trend.startsWith('+') ? styles.isUp : styles.isDown;
				return (
					<div key={p.rank} className={clsx(styles.row, p.me && styles.isMe)}>
						<div className={clsx(styles.rank, rankClass(p.rank))}>
							{rankIcon(p.rank)}
						</div>
						<div className={styles.avatarWrap}>
							<img
								src={`https://ik.imagekit.io/olibos/tr:n-thumb/${p.av}.jpg`}
								alt="avatar"
								className={styles.avatar}
							/>
						</div>
						<div>
							<div className={styles.name}>
								{p.name}
								{p.me && <span className={styles.meTag}>(vous)</span>}
							</div>
						</div>
						<div className={styles.scoreWrap}>
							<div className={styles.score}>
								{p.score} pts
							</div>
							<div className={clsx(styles.trend, trendClass)}>
								{p.trend}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
