/**
 * init-db-rest.js
 * Seeds the Supabase database using the REST API + service role key.
 * No direct PostgreSQL connection needed.
 */
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: responseData ? JSON.parse(responseData) : null });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const products = [
  { sku: 'LK-BS-CU2', name: "LABKEY BASIC WITH 2 RELE'", category: 'BASIC', current_stock: 6 },
  { sku: 'LK-BS-CU4', name: "LABKEY BASIC WITH 4 RELE'", category: 'BASIC', current_stock: 2 },
  { sku: 'LK-BS-CU2-R', name: "LABKEY BASIC WITH 2 RELE' and Radio module", category: 'BASIC RADIO', current_stock: 4 },
  { sku: 'LK-BS-CU4-R', name: "LABKEY BASIC WITH 4 RELE' and Radio module", category: 'BASIC RADIO', current_stock: 0 },
  { sku: 'LK-BS/REM-CU2', name: "LABKEY BASIC REMOTE WITH 2 RELE'", category: 'BASIC REMOTE', current_stock: 1 },
  { sku: 'LK-BS/REM-CU4', name: "LABKEY BASIC REMOTE WITH 4 RELE'", category: 'BASIC REMOTE', current_stock: 0 },
  { sku: 'LK-PR-CU2', name: "LABKEY PRO WITH 2 RELE'", category: 'PRO', current_stock: 4 },
  { sku: 'LK-PR-CU4', name: "LABKEY PRO WITH 4 RELE'", category: 'PRO', current_stock: 2 },
  { sku: 'LK-PR-CU2-R', name: "LABKEY PRO WITH 2 RELE' and Radio module", category: 'PRO RADIO', current_stock: 2 },
  { sku: 'LK-PR-CU4-R', name: "LABKEY PRO WITH 4 RELE' and Radio module", category: 'PRO RADIO', current_stock: 0 },
  { sku: 'LK-PR/REM-CU2', name: "LABKEY PRO REMOTE WITH 2 RELE'", category: 'PRO REMOTE', current_stock: 0 },
  { sku: 'LK-PR/REM-CU4', name: "LABKEY PRO REMOTE WITH 4 RELE'", category: 'PRO REMOTE', current_stock: 0 },
  { sku: 'LK-LT-CU2', name: "LABKEY LTE WITH 2 RELE'", category: 'LTE', current_stock: 4 },
  { sku: 'LK-LT-CU4', name: "LABKEY LTE WITH 4 RELE'", category: 'LTE', current_stock: 2 },
  { sku: 'LK-LT-CU2-R', name: "LABKEY LTE WITH 2 RELE' and Radio module", category: 'LTE RADIO', current_stock: 2 },
  { sku: 'LK-LT-CU4-R', name: "LABKEY LTE WITH 4 RELE' and Radio module", category: 'LTE RADIO', current_stock: 0 },
  { sku: 'LK-LT/RM-CU2', name: "LABKEY LTE REMOTE WITH 2 RELE'", category: 'LTE REMOTE', current_stock: 0 },
  { sku: 'LK-LT/RM-CU4', name: "LABKEY LTE REMOTE WITH 4 RELE'", category: 'LTE REMOTE', current_stock: 0 },
  { sku: 'LK-ST-CU2', name: "LABKEY STAND ALONE WITH 2 RELE'", category: 'STAND ALONE', current_stock: 1 },
  { sku: 'LK-ST-CU4', name: "LABKEY STAND ALONE WITH 4 RELE'", category: 'STAND ALONE', current_stock: 0 },
  { sku: 'LK-ST/ETH-CU4', name: "LABKEY STAND ALONE WITH 4 RELE' ETHERNET", category: 'STAND ALONE', current_stock: 0 },
  { sku: 'LK-ST-CU2-R', name: "LABKEY STAND ALONE WITH 2 RELE' and Radio module", category: 'STAND ALONE RADIO', current_stock: 0 },
  { sku: 'LK-ST-CU4-R', name: "LABKEY STAND ALONE WITH 4 RELE' and Radio module", category: 'STAND ALONE RADIO', current_stock: 0 },
  { sku: 'LK-NX-T', name: 'LABKEY NEXT KEYPAD', category: 'NEXT', current_stock: 7 },
  { sku: 'LK-NX-N', name: 'LABKEY NEXT NFC', category: 'NEXT', current_stock: 8 },
  { sku: 'LK-NX-TN', name: 'LABKEY NEXT KEYPAD + NFC', category: 'NEXT', current_stock: 19 },
  { sku: 'LK-NX-Q', name: 'LABKEY NEXT QR CODE', category: 'NEXT', current_stock: 9 },
  { sku: 'LK-NX-TS', name: 'LABKEY NEXT POCKET', category: 'NEXT', current_stock: 0 },
  { sku: 'LK-MI-T', name: 'LABKEY MINI KEYPAD', category: 'MINI', current_stock: 5 },
  { sku: 'LK-MI-TN', name: 'LABKEY MINI KEYPAD + NFC', category: 'MINI', current_stock: 3 },
  { sku: 'LK-MI-TQ', name: 'LABKEY MINI KEYPAD + QR CODE', category: 'MINI', current_stock: 5 },
  { sku: 'LK-MI-TQN', name: 'LABKEY MINI KEYPAD + QR CODE + NFC', category: 'MINI', current_stock: 9 },
  { sku: 'LK-MI-R', name: 'LABKEY MINI RADIO KEYPAD', category: 'MINI', current_stock: 3 },
  { sku: 'LK-GL-T', name: 'LABKEY GLASS TASTIERINO', category: 'GLASS', current_stock: 0 },
  { sku: 'LK-GL-N', name: 'LABKEY GLASS NFC', category: 'GLASS', current_stock: 5 },
  { sku: 'LK-GL-TN', name: 'LABKEY GLASS TASTIERINO + NFC', category: 'GLASS', current_stock: 5 },
  { sku: 'LK-GL-TQ', name: 'LABKEY GLASS TASTIERINO + QR CODE', category: 'GLASS', current_stock: 9 },
  { sku: 'LK-GL-NQ', name: 'LABKEY GLASS NFC + QR CODE', category: 'GLASS', current_stock: 14 },
  { sku: 'LK-GL-TQN', name: 'LABKEY GLASS KEYPAD + QR CODE + NFC', category: 'GLASS', current_stock: 16 },
  { sku: 'LK-GL-TQN-503', name: 'LABKEY GLASS 503', category: 'GLASS', current_stock: 3 },
  { sku: 'LK-EX-TA', name: 'LABKEY EXTREME VANDALPROOF KEYPAD', category: 'EXTREME', current_stock: 8 },
  { sku: 'LK-EX-QI', name: 'LABKEY EXTREME RECESSED QR CODE', category: 'EXTREME', current_stock: 0 },
  { sku: 'LK-EX-TAC', name: 'LABKEY EXTREME RECESSED VANDALPROOF KEYPAD WITH CARBON BOX', category: 'EXTREME', current_stock: 0 },
  { sku: 'LK-CC-CU2', name: 'LABKEY CREDIT CARD CONTROL UNIT', category: 'CREDIT CARD', current_stock: 0 },
  { sku: 'LK-CC-TN', name: 'LABKEY CREDIT CARD COMMAND DEVICE', category: 'CREDIT CARD', current_stock: 0 },
  { sku: 'LK-ACC-PS/NX', name: 'NEXT protective shield', category: 'ACCESSORY', current_stock: 6 },
  { sku: 'LK-ACC-AS/MI-GL', name: 'MINI / GLASS Control Protective Enclosure', category: 'ACCESSORY', current_stock: 14 },
  { sku: 'LK-PR-CU4-ACC/CU4', name: 'Additional 4-relay plugin with LK-PR-CU4', category: 'PRO', current_stock: 2 },
  { sku: 'LK-ACC/INPUT', name: '4 GPIO Input Management Plugin', category: 'ACCESSORY', current_stock: 0 },
  { sku: 'LK-ALIM/DIN', name: 'DIN Power Supply', category: 'ACCESSORY', current_stock: 0 },
  { sku: 'LK-ACC/LETT-NFC', name: 'Desktop NFC Reader', category: 'ACCESSORY', current_stock: 6 },
  { sku: 'LK-GN-TS', name: 'STANDARD NEUTRAL CARD', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GN-TSO', name: 'STANDARD CARD LABKEY LOGO', category: 'MEDIA', current_stock: 201 },
  { sku: 'LK-GN-TS1', name: 'PERSONALIZED SINGLE-SIDED CARD', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GN-TS2', name: 'PERSONALIZED DOUBLE-SIDED CARD', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GNGP-', name: 'NEUTRAL KEYCHAIN TOKEN (without logo)', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GN-GP2', name: 'KEYCHAIN TOKENS', category: 'MEDIA', current_stock: 269 },
  { sku: 'LK-GN-SK', name: 'NFC STICKERS WITH CUSTOM PRINT', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GN-BF/LK', name: 'SILICONE FITNESS BRACELET WITH LABKEY LOGO', category: 'MEDIA', current_stock: 0 },
  { sku: 'LK-GN-BF1', name: 'SILICONE FITNESS BRACELET', category: 'MEDIA', current_stock: 0 },
];

async function run() {
  console.log(`Seeding ${products.length} products to Supabase via REST API...`);
  console.log(`Target: ${SUPABASE_URL}`);

  // First verify the table exists by doing a HEAD request
  try {
    const checkResult = await supabaseRequest('GET', '/rest/v1/products?limit=1', null);
    console.log('Products table found. Upserting catalog data...');
  } catch (err) {
    const errMsg = err.message;
    if (errMsg.includes('404') || errMsg.includes('PGRST205') || errMsg.includes('schema cache')) {
      console.error('\n⛔ ERROR: The "products" table does not exist yet in your Supabase database.');
      console.error('Please create it first by running the SQL in schema.sql via the Supabase SQL Editor:');
      console.error('  → https://supabase.com/dashboard/project/icnaroyrouproealicyl/sql/new\n');
      process.exit(1);
    }
    throw err;
  }

  // Upsert all 60 products in one batch call
  try {
    const result = await supabaseRequest('POST', '/rest/v1/products', products.map(p => ({
      ...p,
      min_stock_alert: 2
    })));
    console.log(`\n✅ Successfully upserted ${products.length} products into the database!`);
  } catch (err) {
    console.error('Upsert failed:', err.message);
    process.exit(1);
  }
}

run();
