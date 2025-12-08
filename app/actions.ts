'use server';

import pool, { basketballPool } from './lib/db';

export interface MatchData {
  fixture_id: number;
  predict_winner: string;
  confidence: number;
  key_tag_evidence: string[]; // It might be JSON or array in DB
  home_odd: number;
  draw_odd: number;
  away_odd: number;
  result: string | null;
  home_name: string;
  away_name: string;
  fixture_date: string;
}

export interface BasketballMatchData {
  fixture_id: number;
  home_name: string;
  away_name: string;
  fixture_date: string;
  predict_winner: string;
  confidence: number;
  key_tag_evidence: string[];
}

export interface CapitalData {
  day: string;
  capital: number;
}

export async function getCapitalGrowth(): Promise<CapitalData[]> {
  try {
    const client = await pool.connect();
    try {
      const query = `
        WITH RECURSIVE 
        fixtures AS ( 
            SELECT (fixture_date + interval '8 hour')::date AS day, 
                   t1.fixture_id, home_odd, draw_odd, away_odd, 
                   predict_winner, result, confidence 
            FROM ( 
                SELECT fixture_id, predict_winner, confidence, 
                       home_odd, draw_odd, away_odd, result 
                FROM ai_eval 
                WHERE if_bet=1 
                  AND home_odd IS NOT NULL 
                  AND home_odd <> '未找到赔率' 
                  AND result IS NOT NULL 
            ) t1 
            INNER JOIN ( 
                SELECT fixture_id, fixture_date 
                FROM api_football_fixtures 
            ) t2 ON t1.fixture_id=t2.fixture_id 
        ), 
        ranked AS ( 
            SELECT *, 
                   ROW_NUMBER() OVER (PARTITION BY day ORDER BY confidence DESC) AS rn 
            FROM fixtures 
        ), 
        daily_top AS ( 
            SELECT day, fixture_id, predict_winner, result, 
                   CASE predict_winner 
                        WHEN 3 THEN home_odd::numeric 
                        WHEN 1 THEN draw_odd::numeric 
                        WHEN 0 THEN away_odd::numeric 
                   END::numeric AS win_odd 
            FROM ranked 
            WHERE rn <= 5 
        ), 
        days AS ( 
            SELECT DISTINCT day FROM daily_top ORDER BY day 
        ), 
        rec AS ( 
            SELECT (SELECT MIN(day) FROM days) AS day, 
                   CAST(1000 AS numeric(12,2)) AS capital 
            UNION ALL 
            SELECT d.day, 
                   CAST( 
                       ROUND( 
                           ( 
                               ((5 - (SELECT COUNT(*) FROM daily_top t WHERE t.day = rec.day)) * (rec.capital / 5)) 
                               + 
                               ( 
                                   SELECT SUM( 
                                       (rec.capital / 5) * 
                                       CASE WHEN t.predict_winner = t.result 
                                            THEN t.win_odd ELSE 0 END 
                                   ) 
                                   FROM daily_top t 
                                   WHERE t.day = rec.day 
                               ) 
                           ), 2 
                       ) AS numeric(12,2) 
                   ) AS capital 
            FROM rec 
            JOIN days d ON d.day > rec.day 
            WHERE d.day = (SELECT MIN(day) FROM days WHERE day > rec.day) 
        ) 
        SELECT * FROM rec WHERE day < (CURRENT_DATE - INTERVAL '1 day') ORDER BY day;
      `;
      
      const res = await client.query(query);
      return res.rows.map(row => ({
        day: row.day.toISOString().split('T')[0],
        capital: parseFloat(row.capital)
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Capital query error:', error);
    return [];
  }
}

export async function getSuccessRate(): Promise<string> {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          ROUND( 
            100.0 * SUM(CASE WHEN predict_winner = result THEN 1 ELSE 0 END) 
            / COUNT(*), 
            2 
          ) AS success_rate_percent 
        FROM ai_eval 
        WHERE if_bet = 1 
          AND confidence > 0.6 
          AND result IS NOT NULL;
      `;
      const res = await client.query(query);
      if (res.rows.length > 0 && res.rows[0].success_rate_percent) {
        return res.rows[0].success_rate_percent;
      }
      return "0";
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Success rate query error:', error);
    return "0";
  }
}

export async function getTopMatches(startUTC: string, endUTC: string): Promise<MatchData[]> {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          t1.fixture_id, 
          t1.predict_winner, 
          t1.confidence, 
          t1.key_tag_evidence, 
          t1.home_odd, 
          t1.draw_odd, 
          t1.away_odd, 
          t1.result,
          t2.home_name, 
          t2.away_name, 
          t2.fixture_date
        FROM 
          (SELECT fixture_id, predict_winner, confidence, key_tag_evidence, home_odd, draw_odd, away_odd, result 
           FROM ai_eval 
           WHERE if_bet=1 AND confidence > 0.6) t1 
        INNER JOIN 
          (SELECT fixture_id, home_name, away_name, fixture_date 
           FROM api_football_fixtures 
           WHERE fixture_date BETWEEN $1 AND $2) t2 
        ON t1.fixture_id = t2.fixture_id
        ORDER BY t1.confidence DESC
        LIMIT 5;
      `;
      
      const res = await client.query(query, [startUTC, endUTC]);
      
      return res.rows.map(row => {
        // Transform predict_winner code to string
        let winnerStr = "Draw";
        if (Number(row.predict_winner) === 1) winnerStr = "Home Win";
        else if (Number(row.predict_winner) === 0) winnerStr = "Away Win";
        else if (Number(row.predict_winner) === 3) winnerStr = "Draw";
        
        // Transform key_tag_evidence string to array
        let evidence: string[] = [];
        if (typeof row.key_tag_evidence === 'string') {
          evidence = row.key_tag_evidence.split('/').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        } else if (Array.isArray(row.key_tag_evidence)) {
          evidence = row.key_tag_evidence;
        }

        return {
          ...row,
          predict_winner: winnerStr,
          key_tag_evidence: evidence
        };
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

export async function getBasketballMatch(startUTC: string, endUTC: string): Promise<BasketballMatchData | null> {
  try {
    const client = await basketballPool.connect();
    try {
      const query = `
        SELECT 
          t2.fixture_id,
          t2.home_name, 
          t2.away_name, 
          t2.fixture_date, 
          t1.predict_winner, 
          t1.confidence, 
          t1.key_tag_evidence
        FROM 
          (SELECT fixture_id, predict_winner, confidence, key_tag_evidence 
           FROM ai_eval 
           WHERE if_bet=1 AND confidence > 0.6) t1 
        INNER JOIN 
          (SELECT fixture_id, home_name, away_name, fixture_date, result 
           FROM fixtures
           WHERE fixture_date BETWEEN $1 AND $2) t2 
        ON t1.fixture_id = t2.fixture_id
        ORDER BY t1.confidence DESC
        LIMIT 1;
      `;
      
      const res = await client.query(query, [startUTC, endUTC]);
      
      if (res.rows.length === 0) return null;
      
      const row = res.rows[0];
      
      // Transform key_tag_evidence string to array
      let evidence: string[] = [];
      if (typeof row.key_tag_evidence === 'string') {
        evidence = row.key_tag_evidence.split('/').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      } else if (Array.isArray(row.key_tag_evidence)) {
        evidence = row.key_tag_evidence;
      }

      return {
        fixture_id: row.fixture_id,
        home_name: row.home_name,
        away_name: row.away_name,
        fixture_date: row.fixture_date.toISOString(),
        predict_winner: String(row.predict_winner),
        confidence: parseFloat(row.confidence),
        key_tag_evidence: evidence
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Basketball DB query error:', error);
    return null;
  }
}

export async function getBasketballSignals(startUTC: string, endUTC: string): Promise<BasketballMatchData[]> {
  try {
    const client = await basketballPool.connect();
    try {
      const query = `
        SELECT 
          t2.fixture_id,
          t2.home_name, 
          t2.away_name, 
          t2.fixture_date, 
          t1.predict_winner, 
          t1.confidence
        FROM 
          (SELECT fixture_id, predict_winner, confidence 
           FROM ai_eval 
           WHERE if_bet=1 AND confidence > 0.6) t1 
        INNER JOIN 
          (SELECT fixture_id, home_name, away_name, fixture_date, result 
           FROM fixtures
           WHERE fixture_date BETWEEN $1 AND $2) t2 
        ON t1.fixture_id = t2.fixture_id
        ORDER BY t1.confidence DESC
        LIMIT 5;
      `;
      
      const res = await client.query(query, [startUTC, endUTC]);
      
      return res.rows.map(row => ({
        fixture_id: row.fixture_id,
        home_name: row.home_name,
        away_name: row.away_name,
        fixture_date: row.fixture_date.toISOString(),
        predict_winner: String(row.predict_winner),
        confidence: parseFloat(row.confidence),
        key_tag_evidence: [] // Not needed for signals list
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Basketball signals query error:', error);
    return [];
  }
}

export async function getFootballFixtureReport(fixtureId: string): Promise<string | null> {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT report_md
        FROM ai_eval
        WHERE fixture_id = $1
      `;
      const res = await client.query(query, [fixtureId]);
      if (res.rows.length > 0) {
        return res.rows[0].report_md;
      }
      return null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Report query error:', error);
    return null;
  }
}

export async function getBasketballFixtureReport(fixtureId: string): Promise<string | null> {
  try {
    const client = await basketballPool.connect();
    try {
      const query = `
        SELECT report_md
        FROM ai_eval
        WHERE fixture_id = $1
      `;
      const res = await client.query(query, [fixtureId]);
      if (res.rows.length > 0) {
        return res.rows[0].report_md;
      }
      return null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Basketball report query error:', error);
    return null;
  }
}
