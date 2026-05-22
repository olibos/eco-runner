type ScoreBarProps = {
	label: string;
	pts: number;
	max: number;
	colorClass: 'accent' | 'green' | 'orange' | 'purple';
};

export function ScoreBar({ label, pts, max, colorClass }: ScoreBarProps) {
	const pct = Math.min(100, max > 0 ? (pts / max) * 100 : 0);

	return (
		<div className="fo-scorebar-row">
			<div className="fo-scorebar-label">{label}</div>
			<progress className={`fo-scorebar-track fo-color-progress-${colorClass}`} value={Math.max(0, pct)} max={100} />
			<div className={`fo-scorebar-value fo-color-text-${colorClass}`}>
				{pts > 0 ? `+${pts}` : pts}
			</div>
		</div>
	);
}
