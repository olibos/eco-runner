type KpiCardProps = {
	icon: string;
	label: string;
	value: string;
	delta: string;
	deltaGood: boolean;
	sub: string;
	pts: number | null;
	accentClass: 'accent' | 'green' | 'orange' | 'purple';
};

export function KpiCard({
	icon,
	label,
	value,
	delta,
	deltaGood,
	sub,
	pts,
	accentClass,
}: KpiCardProps) {
	return (
		<div className="fo-kpi-card">
			<div className={`fo-kpi-accent fo-color-bg-${accentClass}`} />
			<div className="fo-kpi-icon">{icon}</div>
			<div className="fo-kpi-label">
				{label}
			</div>
			<div className="fo-kpi-value">
				{value}
			</div>
			<div className={`fo-kpi-delta ${deltaGood ? 'is-good' : 'is-bad'}`}>
				{delta}
			</div>
			<div className="fo-kpi-sub">{sub}</div>
			{pts != null && (
				<div className={`fo-kpi-points ${pts > 0 ? 'is-positive' : ''}`}>
					+{pts} pts
				</div>
			)}
		</div>
	);
}
