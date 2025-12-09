import { MetadataRoute } from 'next'
import pool, { basketballPool } from './lib/db'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://betaione.com'
  
  // Base routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
  ]

  // Fetch Football Fixtures (Active & Recent)
  try {
    const client = await pool.connect();
    try {
      // Get matches from last 7 days and future 7 days that have predictions
      const query = `
        SELECT t1.fixture_id, t2.fixture_date
        FROM 
          (SELECT fixture_id FROM ai_eval WHERE if_bet=1 AND confidence > 0.6) t1 
        INNER JOIN 
          (SELECT fixture_id, fixture_date FROM api_football_fixtures 
           WHERE fixture_date BETWEEN NOW() - INTERVAL '7 days' AND NOW() + INTERVAL '7 days') t2 
        ON t1.fixture_id = t2.fixture_id
        ORDER BY t2.fixture_date DESC
        LIMIT 100
      `;
      const res = await client.query(query);
      
      const footballRoutes: MetadataRoute.Sitemap = res.rows.map(row => ({
        url: `${baseUrl}/football/${row.fixture_id}`,
        lastModified: new Date(row.fixture_date),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
      
      routes.push(...footballRoutes);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Sitemap generation error (Football):', error);
  }

  // Fetch Basketball Fixtures (Active & Recent)
  try {
    const client = await basketballPool.connect();
    try {
      // Get matches from last 7 days and future 7 days that have predictions
      const query = `
        SELECT t1.fixture_id, t2.fixture_date
        FROM 
          (SELECT fixture_id FROM ai_eval WHERE if_bet=1 AND confidence > 0.6) t1 
        INNER JOIN 
          (SELECT fixture_id, fixture_date FROM fixtures 
           WHERE fixture_date BETWEEN NOW() - INTERVAL '7 days' AND NOW() + INTERVAL '7 days') t2 
        ON t1.fixture_id = t2.fixture_id
        ORDER BY t2.fixture_date DESC
        LIMIT 100
      `;
      const res = await client.query(query);
      
      const basketballRoutes: MetadataRoute.Sitemap = res.rows.map(row => ({
        url: `${baseUrl}/basketball/${row.fixture_id}`,
        lastModified: new Date(row.fixture_date),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
      
      routes.push(...basketballRoutes);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Sitemap generation error (Basketball):', error);
  }

  return routes
}
