/**
 * init-schema.js
 * Creates the database schema using Supabase Management API.
 * Requires: npm install node-fetch dotenv
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'icnaroyrouproealicyl';

// Schema SQL split into individual statements to execute one by one via REST
const schemaSqlStatements = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  `CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,

  `CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity_change INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'manual_adjustment')),
    invoice_ref VARCHAR(255),
    notes TEXT,
    performed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_stock_transactions_product ON stock_transactions(product_id)`,

  `CREATE TABLE IF NOT EXISTS invoice_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending_approval', 'reconciled', 'failed')),
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,

  `ALTER TABLE products ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow public read access to products') THEN
      CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow public write access to products') THEN
      CREATE POLICY "Allow public write access to products" ON products FOR ALL USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transactions' AND policyname = 'Allow public read access to stock_transactions') THEN
      CREATE POLICY "Allow public read access to stock_transactions" ON stock_transactions FOR SELECT USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transactions' AND policyname = 'Allow public write access to stock_transactions') THEN
      CREATE POLICY "Allow public write access to stock_transactions" ON stock_transactions FOR ALL USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_logs' AND policyname = 'Allow public read access to invoice_logs') THEN
      CREATE POLICY "Allow public read access to invoice_logs" ON invoice_logs FOR SELECT USING (true);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_logs' AND policyname = 'Allow public write access to invoice_logs') THEN
      CREATE POLICY "Allow public write access to invoice_logs" ON invoice_logs FOR ALL USING (true);
    END IF;
  END $$`,
];

function execSQL(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Alternative: use the pg endpoint directly
function execSQLDirect(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/pg/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Testing Supabase REST SQL access...');
  
  // Test what endpoints are available
  const testQuery = 'SELECT version()';
  
  // Try /pg/query endpoint
  try {
    const result = await execSQLDirect(testQuery);
    console.log('✅ /pg/query endpoint works!', result.body);
    return;
  } catch (err) {
    console.log('/pg/query failed:', err.message.substring(0, 100));
  }
  
  // Try /rest/v1/rpc endpoint
  try {
    const result = await execSQL(testQuery);
    console.log('✅ /rest/v1/rpc/exec_sql endpoint works!', result);
  } catch (err) {
    console.log('/rest/v1/rpc/exec_sql failed:', err.message.substring(0, 100));
  }

  console.log('\nℹ️  Both direct SQL execution endpoints are unavailable via REST API.');
  console.log('The only option remaining is to run schema.sql manually in the Supabase SQL Editor.');
  console.log('\n📋 Steps to set up your database (takes ~30 seconds):');
  console.log('1. Go to: https://supabase.com/dashboard/project/icnaroyrouproealicyl/sql/new');
  console.log('2. Paste the contents of: schema.sql');
  console.log('3. Click Run. Then paste seed.sql and click Run again.');
  console.log('\nThe schema.sql and seed.sql files are in your project folder:');
  console.log(`   ${path.join(__dirname, 'schema.sql')}`);
  console.log(`   ${path.join(__dirname, 'seed.sql')}`);
}

run();
