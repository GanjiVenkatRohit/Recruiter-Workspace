const { Pool } = require('pg');
const config = require('./config');

if (!config.databaseUrl) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const isSupabase = config.databaseUrl.includes('supabase.co') || config.databaseUrl.includes('supabase.com') || config.databaseUrl.includes('pooler.supabase');

if (isSupabase) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
