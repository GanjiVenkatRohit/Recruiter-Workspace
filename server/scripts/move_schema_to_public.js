process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const config = require('../src/config');

async function moveSchemaToPublic() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const isSupabase = config.databaseUrl.includes('supabase.co') || config.databaseUrl.includes('supabase.com');
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
  });

  const tables = [
    'candidates',
    'candidate_events',
    'upload_sessions',
    'offline_action_log',
    'recruiters',
    'resume_content',
    'pipeline_audit_log',
    'domain_events'
  ];

  try {
    console.log('Moving tables from "resume" schema to "public" schema...');

    for (const table of tables) {
      try {
        await pool.query(`ALTER TABLE IF EXISTS resume.${table} SET SCHEMA public;`);
        console.log(`  ✓ Moved table 'resume.${table}' -> 'public.${table}'`);
      } catch (err) {
        console.warn(`  ! Could not move table 'resume.${table}': ${err.message}`);
      }
    }

    try {
      await pool.query('DROP SCHEMA IF EXISTS resume CASCADE;');
      console.log('  ✓ Dropped schema "resume"');
    } catch (err) {
      console.warn(`  ! Could not drop schema "resume": ${err.message}`);
    }

    console.log('\n✅ Successfully moved all tables to the "public" schema!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

moveSchemaToPublic();
