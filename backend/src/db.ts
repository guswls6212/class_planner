import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export async function runMigrations(): Promise<void> {
  // Basic connectivity check; real migrations will be added later
  await pool.query('SELECT 1');
}


