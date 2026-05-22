export type ChartMode = 'l100' | 'km' | 'amount';
export type Tab = 'dashboard' | 'leaderboard' | 'challenges';

export const sign = (v: number) => (v > 0 ? '+' : '');

export const fmtPct = (v: number | null) =>
	v == null ? '—' : `${sign(v)}${v.toFixed(1)}%`;
