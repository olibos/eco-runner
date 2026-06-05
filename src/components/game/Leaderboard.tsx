import { useFuelData } from '../../hooks/useFuelData';
import { Dialog } from '../common/Dialog';

import { LbRows } from '../fuel-overlay/LbRows';
import { SectionTitle } from '../fuel-overlay/SectionTitle';
import { AllPlayersShowcase } from '../fuel-overlay/AllPlayersShowcase';

export function Leaderboard() {
	const { data, isLoading, error } = useFuelData();

	if (isLoading) return <Dialog open><div>Chargement...</div></Dialog>;
	if (error || !data) return <Dialog open><div>Erreur: {error || 'Data missing'}</div></Dialog>;

	const hasLeaderboard = data.leaderboard && data.leaderboard.length > 0;

	return (
		<Dialog open>
			<SectionTitle>
				{hasLeaderboard ? 'Classement — Saison 1' : 'Participants — Nouvelle Saison'}
			</SectionTitle>
			{hasLeaderboard ? (
				<LbRows entries={data.leaderboard} />
			) : (
				<AllPlayersShowcase />
			)}
			<button className="dialog-button">Close</button>
		</Dialog>
	);
}
