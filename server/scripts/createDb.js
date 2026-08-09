require('dotenv').config();
const { Client } = require('pg');

async function createDb() {
  // Connect to the default 'postgres' database to issue the CREATE DATABASE command
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // default DB
  });

  try {
    await client.connect();
    console.log('Connected to Postgres server.');
    
    // Check if database exists
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = 'rpc_stock'`);
    if (res.rowCount === 0) {
      console.log('Database rpc_stock does not exist. Creating...');
      await client.query('CREATE DATABASE rpc_stock');
      console.log('Database rpc_stock created successfully!');
    } else {
      console.log('Database rpc_stock already exists.');
    }
  } catch (err) {
    console.error('Failed to create database:', err.message);
  } finally {
    await client.end();
  }
}

createDb();
