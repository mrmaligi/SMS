/**
 * find-pooler.js
 * Discovers the correct Supavisor pooler region for this Supabase project
 * by probing all known pooler hostnames.
 */
const net = require('net');
const { Client } = require('pg');
require('dotenv').config();

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = 'icnaroyrouproealicyl';

// All known Supabase pooler regions as of 2025
const REGIONS = [
  'ap-southeast-1',   // Singapore
  'ap-southeast-2',   // Sydney (Australia)
  'ap-northeast-1',   // Tokyo
  'ap-northeast-2',   // Seoul
  'ap-south-1',       // Mumbai
  'us-east-1',        // US East (N. Virginia)
  'us-west-1',        // US West (N. California)
  'us-west-2',        // US West (Oregon)
  'eu-west-1',        // EU (Ireland)
  'eu-west-2',        // EU (London)
  'eu-central-1',     // EU (Frankfurt)
  'ca-central-1',     // Canada (Central)
  'sa-east-1',        // South America (São Paulo)
];

// Quick TCP check to see if the port is reachable (doesn't authenticate)
function checkTCPPort(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(true); }
    });
    socket.on('timeout', () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(false); }
    });
    socket.on('error', () => {
      if (!resolved) { resolved = true; socket.destroy(); resolve(false); }
    });
    socket.connect(port, host);
  });
}

async function tryPgConnect(host, port) {
  const connStr = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@${host}:${port}/postgres`;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('ENOTFOUND')) return 'not_found';
    if (err.message.includes('password') || err.message.includes('auth')) return 'auth_error';
    return false;
  }
}

async function run() {
  console.log('Discovering your Supabase pooler region...\n');
  
  const reachable = [];
  
  // Phase 1: TCP reachability check (fast - ~3s per host, done in parallel)
  console.log('Phase 1: Checking TCP reachability of all pooler regions...');
  const tcpChecks = REGIONS.map(async (region) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const reachable = await checkTCPPort(host, 5432, 3000);
    if (reachable) console.log(`  ✅ REACHABLE: ${host}`);
    else console.log(`  ❌ unreachable: ${host}`);
    return { region, host, reachable };
  });
  
  const results = await Promise.all(tcpChecks);
  const reachableHosts = results.filter(r => r.reachable);
  
  console.log(`\nPhase 2: Testing PostgreSQL auth on ${reachableHosts.length} reachable host(s)...`);
  
  for (const { region, host } of reachableHosts) {
    console.log(`\nTrying: ${host}:5432 with user postgres.${PROJECT_REF}`);
    const result = await tryPgConnect(host, 5432);
    if (result === true) {
      console.log(`\n🎉 SUCCESS! Connected to pooler: ${host}:5432`);
      console.log(`Connection string: postgresql://postgres.${PROJECT_REF}:PASSWORD@${host}:5432/postgres`);
      
      // Now run the schema!
      await runSchema(host, 5432);
      return;
    } else if (result === 'auth_error') {
      console.log(`  Auth error on ${host} - pooler found but password rejected`);
    } else if (result === 'not_found') {
      console.log(`  Tenant not found on ${host} - project not in this region`);
    } else {
      console.log(`  Failed to connect: ${host}`);
    }
  }
  
  console.log('\n⛔ Could not find a working pooler connection.');
  console.log('Please run the SQL manually in the Supabase dashboard:');
  console.log('https://supabase.com/dashboard/project/icnaroyrouproealicyl/sql/new');
}

async function runSchema(host, port) {
  const fs = require('fs');
  const path = require('path');
  
  const connStr = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@${host}:${port}/postgres`;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('\nRunning schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema created!');
    
    console.log('Running seed.sql (60 products)...');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅ Database seeded with 60 products!');
    
    console.log('\n🚀 DATABASE SETUP COMPLETE! Visit http://localhost:3000 to use the app.');
  } catch (err) {
    console.error('Schema/seed error:', err.message);
  } finally {
    await client.end();
  }
}

run();
