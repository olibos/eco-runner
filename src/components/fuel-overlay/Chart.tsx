import { useFuelData, type MonthStats } from '../../hooks/useFuelData';

import { type ChartMode } from './constants';

type ChartProps = {
	mode: ChartMode;
};

export function Chart({ mode }: ChartProps) {
	const { data: fuelData } = useFuelData();
	if (!fuelData) return null;

	const { MS, CI } = { MS: fuelData.stats, CI: fuelData.CI };

	const field: keyof MonthStats =
		mode === 'l100' ? 'AvgL100Km' : mode === 'km' ? 'MonthlyKm' : 'MonthlyAmountEUR';
	const blField: keyof MonthStats =
		mode === 'l100' ? 'BaselineL100' : mode === 'km' ? 'BaselineKm' : 'BaselineAmountEUR';

	const data = MS.map((m, i) => ({
		lbl: m.MonthKey, // Use MonthKey as label for now or re-derive label
		val: m[field] as number | null,
		bl: m[blField] as number | null,
		cur: i === CI,
	}));

	const allVals = data.flatMap((d) => [d.val, d.bl]).filter((v): v is number => v != null);
	const maxV = allVals.length ? Math.max(...allVals) * 1.18 : 1;
	const blVal = data[CI]?.bl;

	const fmt = (v: number | null) => {
		if (v == null) return '';
		if (mode === 'amount') return '€' + v.toFixed(0);
		if (mode === 'l100') return v.toFixed(1);
		return v.toLocaleString('fr');
	};

	const chartH = 140;
	const chartW = 600;
	const gap = 6;
	const n = data.length;
	const barW = n > 0 ? (chartW - gap * (n - 1)) / n : chartW;
	const yForPct = (p: number) => chartH - (p / 100) * chartH;
	const baselinePct = blVal != null ? (blVal / maxV) * 100 : null;

	return (
		<div className="fo-chart-wrap">
			<svg className="fo-chart-svg" viewBox={`0 0 ${chartW} ${chartH}`} aria-label="Monthly evolution chart">
				{data.map((d, i) => {
					const ratio = d.val != null ? Math.max(0, Math.min(1, d.val / maxV)) : 0;
					const h = d.val != null ? Math.max(2, Math.round(ratio * chartH)) : 0;
					const x = i * (barW + gap);
					const y = chartH - h;
					return (
						<g key={i}>
							<rect
								x={x}
								y={y}
								width={barW}
								height={h}
								rx={3}
								className={d.cur ? 'fo-chart-bar-current' : 'fo-chart-bar-past'}
							/>
							{d.val != null && (
								<text
									x={x + barW / 2}
									y={Math.max(8, y - 4)}
									textAnchor="middle"
									className={d.cur ? 'fo-chart-value is-current' : 'fo-chart-value'}
								>
									{fmt(d.val)}
								</text>
							)}
						</g>
					);
				})}
				{baselinePct != null && (
					<line
						x1={0}
						y1={yForPct(baselinePct)}
						x2={chartW}
						y2={yForPct(baselinePct)}
						className="fo-chart-baseline"
					/>
				)}
			</svg>
			<div className="fo-chart-label-row">
				{data.map((d, i) => (
					<div key={i} className={`fo-chart-label ${d.cur ? 'is-current' : ''}`}>
						{d.lbl}
					</div>
				))}
			</div>
			<div className="fo-chart-legend">
				<div className="fo-chart-legend-item">
					<span className="fo-chart-dot current" />
					Ce mois
				</div>
				<div className="fo-chart-legend-item">
					<span className="fo-chart-dot past" />
					Passés
				</div>
				<div className="fo-chart-legend-item">
					<span className="fo-chart-dot baseline" />
					Baseline
				</div>
			</div>
		</div>
	);
}
