import { createContext, useContext, useMemo, type ReactNode } from 'react';
import useSWR from 'swr';

export interface MonthStats {
    MonthKey: string;
    MonthlyKm: number;
    AvgL100Km: number | null;
    MonthlyAmountEUR: number;
    BaselineL100: number | null;
    BaselineKm: number | null;
    BaselineAmountEUR: number | null;
    DeltaPctL100: number | null;
}

export interface MonthScore {
    MonthKey: string;
    PtsL100: number;
    PtsTrend: number;
    RawScore: number;
    StreakMonths: number;
    Multiplier: number;
    FinalScore: number;
}

export interface LeaderboardEntry {
    rank: number;
    av: string;
    name: string;
    card: string;
    score: number;
    trend: string;
    me: boolean;
}

export interface Badge {
    BadgeCode: string;
    Name: string;
    Description: string;
    Icon: string;
    EarnedMonth: string;
}

interface FuelData {
    stats: MonthStats[];
    scores: MonthScore[];
    badges: Badge[];
    leaderboard: LeaderboardEntry[];
    driver: { name: string, avatar: string, score: number };

    // Computed values
    CUR: MonthStats | null;
    CUR_SCORE: MonthScore | null;
    CI: number;
    cumul: number;
    streak: number;
    M: number;
    finalScore: number;
    blL100: number | null;
    pctL100: number | null;
}

interface FuelContextState {
    data: FuelData | null;
    isLoading: boolean;
    error: string | null;
}

const FuelContext = createContext<FuelContextState | undefined>(undefined);

export function FuelDataProvider({ children }: { children: ReactNode }) {
    const { data: rawData, error, isLoading } = useSWR<FuelData>('/api/fuel')
    const data = useMemo(() => {
        if (!rawData) return null;

        // Compute derived values identical to fuelData.ts logic
        const stats = rawData.stats;
        const scores = rawData.scores;

        const CI = stats.length - 1;
        const CUR = stats[CI] || null;
        const CUR_SCORE = CUR ? (scores.find(s => s.MonthKey === CUR.MonthKey) || scores[scores.length - 1] || null) : null;

        const cumul = scores.reduce((sum, s) => sum + s.FinalScore, 0);
        const streak = CUR_SCORE?.StreakMonths ?? 0;
        const M = CUR_SCORE?.Multiplier ?? 1.0;
        const finalScore = CUR_SCORE?.FinalScore ?? 0;
        const blL100 = CUR?.BaselineL100 ?? null;
        const pctL100 = CUR?.DeltaPctL100 ?? null;

        return {
            ...rawData,
            stats,
            scores,
            CUR,
            CUR_SCORE,
            CI,
            cumul,
            streak,
            M,
            finalScore,
            blL100,
            pctL100,
        };
    }, [rawData]);
    const errorMsg = data ? null : error ? (error instanceof Error ? error.message : String(error)) : null;
    if (errorMsg) {
        console.warn('Error loading fuel data:', errorMsg);
    }

    return (
        <FuelContext.Provider value={{ data, isLoading, error: errorMsg }}>
            {children}
        </FuelContext.Provider>
    );
}

export function useFuelData() {
    const context = useContext(FuelContext);
    if (context === undefined) {
        throw new Error('useFuelData must be used within a FuelDataProvider');
    }
    return context;
}
