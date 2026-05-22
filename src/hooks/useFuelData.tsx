import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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
    LVL: { mn: number; mx: number; title: string };
    lvlPct: number;
}

interface FuelContextState {
    data: FuelData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const FuelContext = createContext<FuelContextState | undefined>(undefined);

export const LVLS = [
    { mn: 0,    mx: 199,   title: 'Apprenti'             },
    { mn: 200,  mx: 499,   title: 'Conducteur Attentif'  },
    { mn: 500,  mx: 999,   title: 'Éco-Conducteur'       },
    { mn: 1000, mx: 1999,  title: 'Éco-Pilote'           },
    { mn: 2000, mx: 3499,  title: 'Pilote Confirmé'      },
    { mn: 3500, mx: 99999, title: 'Champion Éco'         },
];

export function FuelDataProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ data: FuelData | null; loading: boolean; error: string | null }>({
        data: null,
        loading: true,
        error: null,
    });

    const fetchData = async () => {
        try {
            const resp = await fetch('/api/fuel');
            if (!resp.ok) throw new Error('Failed to fetch fuel data');
            const raw = await resp.json();

            // Compute derived values identical to fuelData.ts logic
            const stats = raw.stats as MonthStats[];
            const scores = raw.scores as MonthScore[];
            
            const CI = stats.length - 1;
            const CUR = stats[CI] || null;
            const CUR_SCORE = CUR ? (scores.find(s => s.MonthKey === CUR.MonthKey) || scores[scores.length - 1] || null) : null;
            
            const cumul = scores.reduce((sum, s) => sum + s.FinalScore, 0);
            const streak = CUR_SCORE?.StreakMonths ?? 0;
            const M = CUR_SCORE?.Multiplier ?? 1.0;
            const finalScore = CUR_SCORE?.FinalScore ?? 0;
            const blL100 = CUR?.BaselineL100 ?? null;
            const pctL100 = CUR?.DeltaPctL100 ?? null;

            const LVL = LVLS.find(l => cumul >= l.mn && cumul <= l.mx) ?? LVLS[0]!;
            const lvlPct = Math.min(100, Math.round(((cumul - LVL.mn) / (LVL.mx - LVL.mn)) * 100));

            setState({
                loading: false,
                error: null,
                data: {
                    ...raw,
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
                    LVL,
                    lvlPct,
                }
            });
        } catch (e: any) {
            setState({ data: null, loading: false, error: e.message });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <FuelContext.Provider value={{ ...state, refresh: fetchData }}>
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
