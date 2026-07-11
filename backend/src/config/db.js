const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Database credentials validation
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_password',
  database: process.env.DB_NAME || 'hackathon_db',
  // Max number of clients in pool
  max: 20,
  // Time client can remain idle before being closed
  idleTimeoutMillis: 30000,
  // Connection timeout
  connectionTimeoutMillis: 2000,
  // Production SSL support configuration
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

// Pool event listeners for monitoring connection states
pool.on('connect', () => {
  console.log('[Database] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = {
  /**
   * Execute a SQL query with parameters.
   * Standardizes response and handles automatic client release back to pool.
   * @param {string} text 
   * @param {Array} params 
   * @returns {Promise<import('pg').QueryResult>}
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Database] Query Executed: ${text.slice(0, 100)}... | Duration: ${duration}ms | Rows: ${res.rowCount}`);
      }
      return res;
    } catch (error) {
      console.error('[Database] Query Error:', error.message);
      throw error;
    }
  },

  /**
   * Get a client from the pool to run multi-query transactions.
   * Ensure to call client.release() in a finally block!
   * @returns {Promise<import('pg').PoolClient>}
   */
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Monkey patch the query function to log times during transaction debug
    if (process.env.NODE_ENV !== 'production') {
      client.query = (...args) => {
        console.log(`[Database Transaction] Executing: ${args[0].slice(0, 100)}`);
        return query.apply(client, args);
      };
    }

    // Set a timeout to release client if developer forgets to release it
    const timeout = setTimeout(() => {
      console.error('[Database Transaction] A client has been checked out for more than 10 seconds! Check for leaks.');
    }, 10000);

    client.release = (err) => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client, [err]);
    };

    return client;
  },

  /**
   * Test connection pool connectivity.
   * Used to check database readiness during system startup.
   */
  testConnection: async () => {
    let attempts = 5;
    while (attempts) {
      try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        console.log(`[Database] Database connection successful. Current time: ${res.rows[0].now}`);
        return true;
      } catch (err) {
        attempts -= 1;
        console.warn(`[Database] Connection failed. Retrying in 2 seconds... (${attempts} attempts left)`);
        console.warn(`[Database] Error: ${err.message}`);
        if (attempts === 0) {
          throw new Error('Could not establish database connection after multiple retries.');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  },

  // Close pool (useful for test tear-downs)
  close: () => pool.end()
};
