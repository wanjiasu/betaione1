'use server';

import pool from './lib/db';

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

export async function getTopMatch(startUTC: string, endUTC: string): Promise<MatchData | null> {
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
        LIMIT 1;
      `;
      
      const res = await client.query(query, [startUTC, endUTC]);
      
      if (res.rows.length > 0) {
        const row = res.rows[0];
        
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
      }
      return null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}
