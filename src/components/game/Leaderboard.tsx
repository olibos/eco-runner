import { useFuelData } from '../../hooks/useFuelData';
import { Dialog } from '../common/Dialog';

import { LbRows } from '../fuel-overlay/LbRows';
import { SectionTitle } from '../fuel-overlay/SectionTitle';

export function Leaderboard() {
	const { data, isLoading, error } = useFuelData();

	if (isLoading) return <Dialog open><div>Chargement...</div></Dialog>;
	if (error || !data) return <Dialog open><div>Erreur: {error || 'Data missing'}</div></Dialog>;
	return (
		<Dialog open>
			<SectionTitle>Classement — Saison 1</SectionTitle>
			<LbRows entries={data.leaderboard} />
			<button className="dialog-button">Close</button>
		</Dialog>
	);
}
