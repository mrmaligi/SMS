/**
 * update-stock.js — Updates all 60 products with correct stock counts via Supabase REST API
 */
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function patch(sku, current_stock) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ current_stock });
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: `/rest/v1/products?sku=eq.${encodeURIComponent(sku)}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => res.statusCode < 300 ? resolve() : reject(new Error(`${sku}: HTTP ${res.statusCode} ${d}`)));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

const products = [
  { sku: 'LK-BS-CU2', current_stock: 16 },
  { sku: 'LK-BS-CU4', current_stock: 8 },
  { sku: 'LK-BS-CU2-R', current_stock: 4 },
  { sku: 'LK-BS-CU4-R', current_stock: 0 },
  { sku: 'LK-BS/REM-CU2', current_stock: 1 },
  { sku: 'LK-BS/REM-CU4', current_stock: 0 },
  { sku: 'LK-PR-CU2', current_stock: 12 },
  { sku: 'LK-PR-CU4', current_stock: 4 },
  { sku: 'LK-PR-CU2-R', current_stock: 2 },
  { sku: 'LK-PR-CU4-R', current_stock: 0 },
  { sku: 'LK-PR/REM-CU2', current_stock: 0 },
  { sku: 'LK-PR/REM-CU4', current_stock: 0 },
  { sku: 'LK-LT-CU2', current_stock: 7 },
  { sku: 'LK-LT-CU4', current_stock: 8 },
  { sku: 'LK-LT-CU2-R', current_stock: 2 },
  { sku: 'LK-LT-CU4-R', current_stock: 0 },
  { sku: 'LK-LT/RM-CU2', current_stock: 0 },
  { sku: 'LK-LT/RM-CU4', current_stock: 0 },
  { sku: 'LK-ST-CU2', current_stock: 3 },
  { sku: 'LK-ST-CU4', current_stock: 0 },
  { sku: 'LK-ST/ETH-CU4', current_stock: 0 },
  { sku: 'LK-ST-CU2-R', current_stock: 0 },
  { sku: 'LK-ST-CU4-R', current_stock: 0 },
  { sku: 'LK-NX-T', current_stock: 7 },
  { sku: 'LK-NX-N', current_stock: 8 },
  { sku: 'LK-NX-TN', current_stock: 19 },
  { sku: 'LK-NX-Q', current_stock: 9 },
  { sku: 'LK-NX-TS', current_stock: 0 },
  { sku: 'LK-MI-T', current_stock: 5 },
  { sku: 'LK-MI-TN', current_stock: 3 },
  { sku: 'LK-MI-TQ', current_stock: 5 },
  { sku: 'LK-MI-TQN', current_stock: 9 },
  { sku: 'LK-MI-R', current_stock: 3 },
  { sku: 'LK-GL-T', current_stock: 0 },
  { sku: 'LK-GL-N', current_stock: 5 },
  { sku: 'LK-GL-TN', current_stock: 5 },
  { sku: 'LK-GL-TQ', current_stock: 9 },
  { sku: 'LK-GL-NQ', current_stock: 14 },
  { sku: 'LK-GL-TQN', current_stock: 16 },
  { sku: 'LK-GL-TQN-503', current_stock: 3 },
  { sku: 'LK-EX-TA', current_stock: 8 },
  { sku: 'LK-EX-QI', current_stock: 0 },
  { sku: 'LK-EX-TAC', current_stock: 0 },
  { sku: 'LK-CC-CU2', current_stock: 0 },
  { sku: 'LK-CC-TN', current_stock: 0 },
  { sku: 'LK-ACC-PS/NX', current_stock: 16 },
  { sku: 'LK-ACC-AS/MI-GL', current_stock: 14 },
  { sku: 'LK-PR-CU4-ACC/CU4', current_stock: 4 },
  { sku: 'LK-ACC/INPUT', current_stock: 0 },
  { sku: 'LK-ALIM/DIN', current_stock: 0 },
  { sku: 'LK-ACC/LETT-NFC', current_stock: 6 },
  { sku: 'LK-GN-TS', current_stock: 0 },
  { sku: 'LK-GN-TSO', current_stock: 201 },
  { sku: 'LK-GN-TS1', current_stock: 0 },
  { sku: 'LK-GN-TS2', current_stock: 0 },
  { sku: 'LK-GNGP-', current_stock: 0 },
  { sku: 'LK-GN-GP2', current_stock: 269 },
  { sku: 'LK-GN-SK', current_stock: 0 },
  { sku: 'LK-GN-BF/LK', current_stock: 0 },
  { sku: 'LK-GN-BF1', current_stock: 0 },
];

async function run() {
  console.log(`Updating ${products.length} product stock counts...`);
  let ok = 0, fail = 0;
  for (const p of products) {
    try {
      await patch(p.sku, p.current_stock);
      console.log(`  ✅ ${p.sku} → ${p.current_stock}`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} updated, ${fail} failed.`);
}

run();
