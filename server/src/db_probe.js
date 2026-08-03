const { Client } = require('pg');

async function testUrl(url) {
  console.log(`Probing: ${url}`);
  const client = new Client({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false
    }
  });
  try {
    await client.connect();
    console.log(`✅ Success!`);
    const res = await client.query('SELECT current_database(), current_schema()');
    console.log('QueryResult:', res.rows);
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function run() {
  const url1 = 'postgresql://postgres.detegukuqcghmzssrezn:GanjiRohit%402003@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';
  const url2 = 'postgresql://postgres.detegukuqcghmzssrezn:GanjiRohit%402003@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require';
  
  const ok1 = await testUrl(url1);
  if (!ok1) {
    await testUrl(url2);
  }
}

run();
