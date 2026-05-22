// All routes here are mounted under /api and protected by requireAuth.
// Add your domain-specific endpoints in this file (or split into sub-routers).

import { Elysia, t } from "elysia"
import { authPlugin } from "../plugins/auth";
import { getPool, sql } from "../db";

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
      .get("/fuel", async ({ user }) => {
        if (!user) return new Response("Unauthorized", { status: 401 });
        
        const pool = await getPool();
        const email = user.email;

        // 1. Resolve DriverId
        const userRes = await pool.request()
          .input("email", sql.NVarChar, email)
          .query(`
            SELECT DriverId, Name,
            Score = (
                select sum(s.FinalScore)
                from game.FuelScores s
                where s.DriverId = Users.DriverId
                and exists (select 1 from game.FuelSeasons where SeasonId = s.SeasonId and IsActive = 1)
            )
            FROM game.Users WHERE Email = @email
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
        }
        

        // 2. Fetch stats, scores, badges, and leaderboard in parallel
        const [statsRes, scoresRes, badgesRes, lbRes] = await Promise.all([
          pool.request()
            .input("driverId", sql.NVarChar, DriverId)
            .query(`
                SELECT MonthKey, MonthlyKm, AvgL100Km, MonthlyAmountEUR, BaselineL100, BaselineKm, BaselineAmountEUR, DeltaPctL100 FROM (
                SELECT TOP 6 * FROM game.FuelMonthlyStats 
                WHERE DriverId = @driverId 
                ORDER BY MonthKey DESC
              ) AS t ORDER BY MonthKey ASC
            `),
          
          pool.request()
            .input("driverId", sql.NVarChar, DriverId)
            .query(`
              SELECT MonthKey, PtsL100, PtsTrend, RawScore, StreakMonths, Multiplier, FinalScore FROM (
                SELECT TOP 6 * FROM game.FuelScores 
                WHERE DriverId = @driverId 
                ORDER BY MonthKey DESC
              ) AS t ORDER BY MonthKey ASC
            `),

          pool.request()
            .input("driverId", sql.NVarChar, DriverId)
            .query(`
              SELECT d.BadgeCode, d.Name, d.Description, d.Icon, b.EarnedMonth 
              FROM game.FuelBadgeDefinitions d
              LEFT JOIN game.FuelBadges b ON d.BadgeCode = b.BadgeCode AND b.DriverId = @driverId
              ORDER BY d.SortOrder ASC
            `),

          pool.request()
            .query(`
              SELECT TOP 10 
                s.DriverId, 
                u.Name, 
                u.Email, 
                SUM(s.FinalScore) as TotalScore,
                (
                  SELECT TOP 1 fs.FinalScore 
                  FROM game.FuelScores fs 
                  WHERE fs.DriverId = s.DriverId 
                  AND fs.SeasonId = (SELECT SeasonId FROM game.FuelSeasons WHERE IsActive = 1)
                  ORDER BY fs.MonthKey DESC
                ) as LastTrend
              FROM game.FuelScores s
              JOIN game.Users u ON s.DriverId = u.DriverId
              WHERE s.SeasonId = (SELECT SeasonId FROM game.FuelSeasons WHERE IsActive = 1)
              GROUP BY s.DriverId, u.Name, u.Email
              ORDER BY TotalScore DESC
            `),
        ]);

        return {
          driver: { name: Name, avatar: hash(email), score: Score },
          stats: statsRes.recordset,
          scores: scoresRes.recordset,
          badges: badgesRes.recordset,
          leaderboard: lbRes.recordset.map((r, i) => ({
            rank: i + 1,
            av: hash(r.Email),
            name: r.Name,
            score: r.TotalScore,
            trend: r.LastTrend > 0 ? `+${r.LastTrend}` : `+0`,
            me: r.DriverId.toLowerCase() === DriverId?.toLowerCase()
          }))
        };
      });
