// All routes here are mounted under /api and protected by requireAuth.
// Add your domain-specific endpoints in this file (or split into sub-routers).

import { Elysia, t } from "elysia"
import { authPlugin } from "../plugins/auth";
import { getPool, sql } from "../db";
import type { IRecordSet } from "mssql";

function hash(email: string): string {
    const hasher = new Bun.CryptoHasher("md5");
    hasher.update(email.toLowerCase().replace(/[^a-z0-9._-]/g, "_"));
    return hasher.digest("hex");
}

export const apiRoutes = new Elysia({ prefix: "/api" })
      .use(authPlugin)   
      // ── GET /api/me — echo the session user back to the client ──────────────
      .get("/me", ({ user }) => ({
        sub:   user!.sub,
        email: user!.email,
        name:  user!.name,
        avatar: user!.avatar,
      }))
      // ── GET /api/fuel — full dashboard data payload ────────────────────────
      .get("/fuel", async ({ user, set, request }) => {
        if (!user) return new Response("Unauthorized", { status: 401 });
        
        const pool = await getPool();
        const email = user.email;

        // 1. Resolve DriverId
        const userRes = await pool.request()
          .input("email", sql.NVarChar, email)
          .query(`
            SELECT 
                u.DriverId, 
                u.Name,
                agg.Score,
                agg.LastUpdate
            FROM game.Users u
            OUTER APPLY (
                SELECT 
                    SUM(s.FinalScore) AS Score,
                    MAX(s.ComputedAt) AS LastUpdate
                FROM game.FuelScores s
                JOIN game.FuelSeasons fs ON fs.SeasonId = s.SeasonId
                WHERE s.DriverId = u.DriverId
                  AND fs.IsActive = 1
            ) agg
            WHERE u.Email = @email;
          `);
        
        let DriverId: string | undefined;
        let Name: string;
        let Score: number | undefined;
        if (userRes.recordset.length === 0) {
          Name = user.name;
        }
        else {
          DriverId = userRes.recordset[0].DriverId;
          Name = userRes.recordset[0].Name;
          Score = userRes.recordset[0].Score;
          const etag = new Bun.MD5().update(`${DriverId}-${userRes.recordset[0].LastUpdate}`).digest("hex");
          if (etag === request.headers.get("if-none-match")) {
            return new Response(null, { status: 304 });
          }
          set.headers.etag = etag;
        }
        
        const results = await pool.request()
            .input("driverId", sql.NVarChar, DriverId)
            .query(`
    -- 1. Stats
    SELECT MonthKey, MonthlyKm, AvgL100Km, MonthlyAmountEUR, BaselineL100, BaselineKm, BaselineAmountEUR, DeltaPctL100 
    FROM (
      SELECT TOP 6 * FROM game.FuelMonthlyStats 
      WHERE DriverId = @driverId 
      ORDER BY MonthKey DESC
    ) AS t ORDER BY MonthKey ASC;
    
    -- 2. Scores
    SELECT MonthKey, PtsL100, PtsTrend, RawScore, StreakMonths, Multiplier, FinalScore 
    FROM (
      SELECT TOP 6 * FROM game.FuelScores 
      WHERE DriverId = @driverId 
      ORDER BY MonthKey DESC
    ) AS t ORDER BY MonthKey ASC;

    -- 3. Badges (Uses the same @driverId)
    SELECT d.BadgeCode, d.Name, d.Description, d.Icon, b.EarnedMonth 
    FROM game.FuelBadgeDefinitions d
    LEFT JOIN game.FuelBadges b ON d.BadgeCode = b.BadgeCode AND b.DriverId = @driverId
    ORDER BY d.SortOrder ASC;

    -- 4. Leaderboard
    DECLARE @ActiveSeasonId INT = (SELECT TOP 1 SeasonId FROM game.FuelSeasons WHERE IsActive = 1);

    WITH CTE_TopDrivers AS (
        SELECT DriverId, 
            SUM(FinalScore) AS TotalScore
        FROM game.FuelScores
        WHERE SeasonId = @ActiveSeasonId
        GROUP BY DriverId
    ),
    CTE_Ranked AS (
        SELECT 
            RANK() OVER (ORDER BY d.TotalScore DESC) AS Rank,
            d.DriverId, 
            u.Name, 
            u.Email, 
            d.TotalScore,
            (
                SELECT TOP 1 fs.FinalScore 
                FROM game.FuelScores fs 
                WHERE fs.DriverId = d.DriverId 
                AND fs.SeasonId = @ActiveSeasonId
                ORDER BY fs.MonthKey DESC
            ) AS LastTrend
        FROM CTE_TopDrivers d
        JOIN game.Users u ON d.DriverId = u.DriverId
    )
    SELECT * 
    FROM CTE_Ranked
    WHERE Rank <= 10
    ORDER BY Rank, Name;
                `);
        const [statsRes, scoresRes, badgesRes, lbRes] = results.recordsets as [IRecordSet<any>, IRecordSet<any>, IRecordSet<any>, IRecordSet<any>];

        return {
          driver: { name: Name, avatar: hash(email), score: Score },
          stats: statsRes,
          scores: scoresRes,
          badges: badgesRes,
          leaderboard: lbRes?.map((r) => ({
            rank: r.Rank,
            av: hash(r.Email),
            name: r.Name,
            score: r.TotalScore,
            trend: r.LastTrend > 0 ? `+${r.LastTrend}` : `+0`,
            me: r.DriverId.toLowerCase() === DriverId?.toLowerCase()
          })),
          etag: set.headers.etag
        };
      });
