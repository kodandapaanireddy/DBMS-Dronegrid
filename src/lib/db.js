import { Pool } from 'pg';

// PostgreSQL connection pool. Uses DATABASE_URL (postgres://...).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dronegrid',
  max: 20,
  idleTimeoutMillis: 30000,
});

/**
 * Run a parameterized query.
 * @param {string} text - SQL with $1, $2 ... placeholders.
 * @param {Array} params - query parameters.
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Acquire a client for a manual transaction (BEGIN/COMMIT/ROLLBACK).
 * @returns {Promise<import('pg').PoolClient>}
 */
export async function client() {
  return pool.connect();
}

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});