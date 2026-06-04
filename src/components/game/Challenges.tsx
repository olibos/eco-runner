import { useLocalState } from '../../hooks/local-state';
import { useFuelData } from '../../hooks/useFuelData';
import { Dialog } from '../common/Dialog';

import { SectionTitle } from '../fuel-overlay/SectionTitle';
import { ChallengesHelp } from './ChallengesHelp';

const Icons : Record<string, string> = {
	SEEDLING: '🌱',
	STREAK: '🔥',
	BOLT: '⚡',
	STAR: '⭐',
	TROPHY: '🏆',
	CHART: '📊',
	CROWN: '👑',
};
export function Challenges() {
	const { data, isLoading, error } = useFuelData();
	const [showHelp, setShowHelp] = useLocalState('show-help', true);

	console.info({data, showHelp, isLoading, error});
	if (showHelp) return <ChallengesHelp onClose={() => { console.info('close');setShowHelp(false)}} />;
	if (isLoading) return <Dialog open><div>Chargement...</div></Dialog>;
	if (error || !data) return <Dialog open><div>Erreur: {error || 'Data missing'}</div></Dialog>;

	const { CUR, CUR_SCORE, blL100, pctL100, badges: BADGES, M, streak } = data;
	if (!CUR || !CUR_SCORE) return <Dialog open><div>Données de performance manquantes</div></Dialog>;
	const challenges = [
		{
			ic: '⛽',
			title: 'Réduire la conso L/100',
			desc: 'Consommation vs ta baseline (moy. 3 mois précédents)',
			prog: pctL100 != null ? Math.min(100, Math.max(0, Math.round((-pctL100 / 10) * 100))) : 0,
			gradClass: 'grad-accent',
			pts: CUR_SCORE.PtsL100,
			maxP: 150,
			done: CUR_SCORE.PtsL100 >= 60,
			st:
				pctL100 != null
					? `${CUR!.AvgL100Km} L/100 vs baseline ${blL100?.toFixed(2)} (${pctL100.toFixed(1)}%)`
					: 'Données insuffisantes',
		},
		{
			ic: '📈',
			title: 'Tendance mensuelle',
			desc: 'Amélioration vs le mois précédent',
			prog: CUR_SCORE.PtsTrend > 0 ? 100 : 0,
			gradClass: 'grad-green',
			pts: CUR_SCORE.PtsTrend,
			maxP: 75,
			done: CUR_SCORE.PtsTrend > 0,
			st: CUR_SCORE.PtsTrend > 0 ? 'En amélioration vs mois dernier' : 'Stagnation ou hausse',
		},
		{
			ic: '🔥',
			title: 'Régularité — multiplicateur',
			desc: 'Multiplie tous les points si la conso reste sous la baseline',
			prog: Math.min(100, Math.round((streak / 4) * 100)),
			gradClass: 'grad-purple',
			pts: M > 1 ? Math.round(CUR_SCORE.RawScore * (M - 1)) : 0,
			maxP: Math.max(CUR_SCORE.RawScore, 1),
			done: streak >= 2,
			st: `${streak} mois consécutif(s) → ×${M.toFixed(2)}`,
		},
	];

	return (
		<Dialog open onHelp={() => setShowHelp(true)}>
			<SectionTitle>Défis du mois</SectionTitle>
			<div className="fo-challenges-list">
				{challenges.map((c, i) => (
					<div key={i} className={`fo-challenge-card ${c.done ? 'is-done' : ''}`}>
						<div className="fo-challenge-head">
							<div>
								<div className="fo-challenge-icon">{c.ic}</div>
								<div className="fo-challenge-title">{c.title}</div>
								<div className="fo-challenge-desc">{c.desc}</div>
							</div>
							<div className={`fo-challenge-pts ${c.pts > 0 ? 'is-positive' : ''}`}>
								+{c.pts} pts
							</div>
						</div>
						<div>
							<div className="fo-challenge-progress-head">
								<span>Progression</span>
								<span>{c.prog}%</span>
							</div>
							<progress className={`fo-challenge-progress ${c.gradClass}`} value={c.prog} max={100} />
						</div>
						<div className={`fo-challenge-status ${c.done ? 'is-done' : ''}`}>
							{c.done ? '✅' : '⏳'} {c.st}
						</div>
					</div>
				))}
			</div>

			<SectionTitle>Badges</SectionTitle>
			<div className="fo-badges-grid">
				{BADGES.map((b, i) => (
					<div
						key={i}
						title={b.Description}
						className={`fo-badge-card ${b.EarnedMonth ? 'is-earned' : ''}`}
					>
						<div className="fo-badge-icon">{Icons[b.Icon]}</div>
						<div className="fo-badge-name">
							{b.Name}
						</div>
					</div>
				))}
			</div>
			<button className="dialog-button">Close</button>
		</Dialog>
	);
}
