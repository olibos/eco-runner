import { useState } from 'react';
import { useFuelData } from '../../hooks/useFuelData';
import { Dialog } from '../common/Dialog';
import { Chart } from '../fuel-overlay/Chart';
import { KpiCard } from '../fuel-overlay/KpiCard';
import { LbRows } from '../fuel-overlay/LbRows';
import { ScoreBar } from '../fuel-overlay/ScoreBar';
import { SectionTitle } from '../fuel-overlay/SectionTitle';
import { fmtPct, type ChartMode } from '../fuel-overlay/constants';

export function Dashboard() {
	const { data, loading, error } = useFuelData();
	const [chartMode, setChartMode] = useState<ChartMode>('l100');
	const kpiSign = (v: number | null) => v != null && v <= 0;

	if (loading) return <Dialog open><div>Chargement...</div></Dialog>;
	if (error || !data) return <Dialog open><div>Erreur: {error || 'Data missing'}</div></Dialog>;

	const { CUR, CUR_SCORE, blL100, pctL100, finalScore, streak, M, leaderboard: LB, driver: { score } } = data;

	if (!CUR || !CUR_SCORE) return <Dialog open><div>Données de performance manquantes</div></Dialog>;
	return (
		<Dialog open>

			<div className="fo-dashboard-grid">
				<div>
					<SectionTitle>Performances — {CUR.MonthKey.replace('-', ' · ')}</SectionTitle>
					<div className="fo-kpi-grid">
						<KpiCard
							icon="⛽"
							label="L / 100 km"
							value={CUR.AvgL100Km?.toFixed(2) ?? '—'}
							delta={fmtPct(pctL100) + ' vs baseline'}
							deltaGood={kpiSign(pctL100)}
							sub={`Baseline : ${blL100?.toFixed(2) ?? '—'} L/100`}
							pts={CUR_SCORE.PtsL100}
							accentClass="accent"
						/>
						<KpiCard
							icon="📈"
							label="Tendance"
							value={CUR_SCORE.PtsTrend > 0 ? '🔼' : '⏺️'}
							delta={fmtPct(CUR_SCORE.PtsTrend)}
							deltaGood={CUR_SCORE.PtsTrend > 0}
							sub="Amélioration mensuelle"
							pts={CUR_SCORE.PtsTrend}
							accentClass="green"
						/>
						<KpiCard
							icon="📏"
							label="Distance"
							value={CUR.MonthlyKm.toLocaleString('fr')}
							delta="Km total"
							deltaGood={true}
							sub="Kilométrage mensuel"
							pts={null}
							accentClass="orange"
						/>
						<KpiCard
							icon="💶"
							label="Dépense €"
							value={`€${CUR.MonthlyAmountEUR.toFixed(0)}`}
							delta="Total"
							deltaGood={true}
							sub="Dépense carburant"
							pts={null}
							accentClass="purple"
						/>
					</div>

					<SectionTitle>Évolution mensuelle</SectionTitle>
					<div className="fo-glass-panel fo-panel-pad-md">
						<div className="fo-chart-mode-row">
							{(['l100', 'km', 'amount'] as ChartMode[]).map((m) => (
								<button
									key={m}
									onClick={() => setChartMode(m)}
									className={`fo-chart-mode-btn ${chartMode === m ? 'is-active' : ''}`}
									type="button"
								>
									{m === 'l100' ? 'L/100' : m === 'km' ? 'Km' : '€'}
								</button>
							))}
						</div>
						<Chart mode={chartMode} />
					</div>
				</div>

				<div>
					<SectionTitle>Score du mois</SectionTitle>
					<div className="fo-glass-panel fo-panel-pad-md fo-mb-14">
						<div className="fo-score-header-row">
							<div>
								<div className="fo-score-title">
									Score du mois
								</div>
								<div className="fo-score-value">
									{finalScore}
								</div>
							</div>
							{streak >= 2 && (
								<div className="fo-streak-badge">
									🔥 {streak} mois · ×{M.toFixed(2)}
								</div>
							)}
						</div>
						
						<div className="fo-scorebar-row">
							<div className="fo-scorebar-label">Score de la saison</div><span></span><div className="fo-scorebar-value fo-color-text-accent">{score}</div></div>
						<ScoreBar label="L/100 vs baseline" pts={CUR_SCORE.PtsL100} max={150} colorClass="accent" />
						<ScoreBar label="Tendance mensuelle" pts={CUR_SCORE.PtsTrend} max={75} colorClass="green" />
						<ScoreBar
							label="Bonus régularité"
							pts={M > 1 ? Math.round(CUR_SCORE.RawScore * (M - 1)) : 0}
							max={Math.max(CUR_SCORE.RawScore, 1)}
							colorClass="purple"
						/>
					</div>

					<SectionTitle>Top classement</SectionTitle>
					<div className="fo-glass-panel fo-panel-pad-sm">
						<LbRows entries={LB.slice(0, 3)} />
					</div>
				</div>
			</div>
			<button className="dialog-button">Close</button>
		</Dialog>
	);
}
