const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function tryConnect(connectionString) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.warn(`Connection failed for: ${connectionString.split('@')[1]} - ${err.message}`);
    return null;
  }
}

async function run() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error('Error: SUPABASE_DB_PASSWORD is not set in the .env file.');
    process.exit(1);
  }

  // Candidates for connection string using the Supavisor Pooler
  const candidates = [
    // 1. Sydney Pooler Session Mode (Port 5432 - Supports Prepared Statements)
    `postgresql://postgres.icnaroyrouproealicyl:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`,
    // 2. Sydney Pooler Transaction Mode (Port 6543)
    `postgresql://postgres.icnaroyrouproealicyl:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`,
    // 3. US East 1 Pooler Session Mode (Fallback)
    `postgresql://postgres.icnaroyrouproealicyl:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    // 4. Singapore Pooler Session Mode (Fallback)
    `postgresql://postgres.icnaroyrouproealicyl:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
  ];

  let client = null;
  for (const connStr of candidates) {
    const hostInfo = connStr.split('@')[1];
    console.log(`Attempting connection to: ${hostInfo}`);
    client = await tryConnect(connStr);
    if (client) {
      console.log(`Connected successfully to: ${hostInfo}`);
      break;
    }
  }

  if (!client) {
    console.error('Error: Could not connect to any database pooler. Please verify your network and that your database password is correct.');
    process.exit(1);
  }

  try {
    // Read and run schema.sql
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Executing schema.sql DDL...');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // Read and run seed.sql
    console.log('Reading seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    console.log('Executing seed.sql inserts (60 products)...');
    await client.query(seedSql);
    console.log('Database seeded successfully!');

  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
