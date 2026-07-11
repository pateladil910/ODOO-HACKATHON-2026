const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_password',
  database: 'postgres' // Connect to default DB first to create target DB
};

const initDb = async () => {
  const targetDb = process.env.DB_NAME || 'hackathon_db';
  console.log(`[DB Setup] Connecting to PostgreSQL at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);
  
  let client = new Client(dbConfig);
  try {
    await client.connect();
    
    // Check if target database exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (res.rowCount === 0) {
      console.log(`[DB Setup] Database "${targetDb}" does not exist. Creating...`);
      // CREATE DATABASE cannot be run with parameterized name, construct query string carefully
      // targetDb is validated / read from env
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`[DB Setup] Database "${targetDb}" created successfully.`);
    } else {
      console.log(`[DB Setup] Database "${targetDb}" already exists.`);
    }
  } catch (error) {
    console.error('[DB Setup] Failed to connect/create database:', error.message);
    console.error('Please verify that PostgreSQL is running and your DB_PASSWORD is correct in .env');
    process.exit(1);
  } finally {
    await client.end();
  }

  // Now connect to the target database and run init.sql
  console.log(`[DB Setup] Connecting to "${targetDb}" to run init.sql schema...`);
  dbConfig.database = targetDb;
  client = new Client(dbConfig);
  try {
    await client.connect();
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('[DB Setup] init.sql schema and seed data loaded successfully!');
  } catch (error) {
    console.error('[DB Setup] Failed to load schema:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

initDb();
