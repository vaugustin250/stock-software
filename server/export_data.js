/**
 * export_data.js
 * Connects to the LOCAL PostgreSQL database and exports all master/product data
 * to a JSON file that can be imported to the cloud.
 *
 * Run from: d:\stock software\server\
 *   node export_data.js
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

async function main() {
  console.log(`Connecting to local DB: ${process.env.DB_NAME} on ${process.env.DB_HOST}...`);

  const tables = [
    'department',
    'product_group',
    'unit',
    'product',
    'branch',
    'app_user',
    'rate_change',
    'rate_ack',
  ];

  const data = {};
  for (const table of tables) {
    try {
      const rows = await knex(table).select('*');
      data[table] = rows;
      console.log(`  ✓ ${table}: ${rows.length} rows`);
    } catch (e) {
      console.log(`  ⚠ ${table}: skipped (${e.message})`);
      data[table] = [];
    }
  }

  const outputPath = path.join(__dirname, '..', 'data_export.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nExport complete! Saved to: ${outputPath}`);
  process.exit(0);
}

main().catch(e => {
  console.error('Export failed:', e.message);
  process.exit(1);
});
