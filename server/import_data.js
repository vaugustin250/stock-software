/**
 * import_data.js
 * Imports exported JSON data into the cloud database.
 * Run from: /home/ubuntu/stock-software/server/
 *   node import_data.js
 */

require('dotenv').config();
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }
});

const fs = require('fs');
const path = require('path');

// Resolve relative to this file's location
const dataPath = path.join(__dirname, 'data_export.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Order matters for FK constraints
const importOrder = [
  'department',
  'product_group',
  'unit',
  'product',
  'branch',
  'app_user',
  'rate_change',
  'rate_ack',
];

async function upsertRows(table, rows, conflictCol) {
  if (!rows || rows.length === 0) {
    console.log(`  - ${table}: no rows to import`);
    return;
  }
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      await knex(table).insert(row).onConflict(conflictCol).merge();
      inserted++;
    } catch (e) {
      console.log(`    ⚠ ${table} row ${row.id}: ${e.message.split('\n')[0]}`);
      skipped++;
    }
  }
  console.log(`  ✓ ${table}: ${inserted} upserted, ${skipped} skipped`);
}

// Reset PG sequences after insert so new IDs don't clash
async function resetSequence(table) {
  try {
    await knex.raw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM "${table}") + 1)`);
  } catch (e) {
    // sequence may not exist, ignore
  }
}

async function main() {
  console.log('Starting import to cloud DB:', process.env.DB_NAME);
  console.log('');

  // Temporarily disable FK checks isn't available in PG easily — we insert in order instead
  for (const table of importOrder) {
    const rows = data[table] || [];
    await upsertRows(table, rows, 'id');
    await resetSequence(table);
  }

  console.log('\nImport complete!');
  process.exit(0);
}

main().catch(e => {
  console.error('Import failed:', e.message);
  process.exit(1);
});
