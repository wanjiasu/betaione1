import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'bc_agent',
});

export const basketballPool = new Pool({
  user: process.env.basketball_POSTGRES_USER,
  password: process.env.basketball_POSTGRES_PASSWORD,
  host: process.env.basketball_POSTGRES_HOST,
  port: parseInt(process.env.basketball_POSTGRES_PORT || '5432'),
  database: process.env.basketball_POSTGRES_DB,
});

export default pool;
