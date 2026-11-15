require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5, // Safe limit for Supabase Free Tier connection bounds
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  query_timeout: 6000,
  statement_timeout: 6000,
  keepAlive: true
});

pool.on('error', (err) => {
  console.warn('Unexpected PostgreSQL idle client error:', err.message);
});

module.exports = pool;
