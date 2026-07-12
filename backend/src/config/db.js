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

let useMock = false;

const mockDb = {
  users: [
    {
      id: 1,
      email: 'admin@hackathon.com',
      password: '$2a$10$VPoSK4JXQak5qemFj2s5sOj0wBm.H4xZv5ZXhdy/GZ3ZmHRrV0HpW', // adminpassword
      role: 'admin',
      created_at: new Date()
    },
    {
      id: 2,
      email: 'user@hackathon.com',
      password: '$2a$10$iBMvE8lcWruTRykKlZWt5egPsqob8A7Dj.rAkE6o8pTE/6.yMWT3C', // userpassword
      role: 'user',
      created_at: new Date()
    },
    {
      id: 3,
      email: 'manager@transitops.com',
      password: '$2a$10$VPoSK4JXQak5qemFj2s5sOj0wBm.H4xZv5ZXhdy/GZ3ZmHRrV0HpW', // adminpassword
      role: 'fleet_manager',
      created_at: new Date()
    },
    {
      id: 4,
      email: 'driver@transitops.com',
      password: '$2a$10$VPoSK4JXQak5qemFj2s5sOj0wBm.H4xZv5ZXhdy/GZ3ZmHRrV0HpW', // adminpassword
      role: 'driver',
      created_at: new Date()
    },
    {
      id: 5,
      email: 'safety@transitops.com',
      password: '$2a$10$VPoSK4JXQak5qemFj2s5sOj0wBm.H4xZv5ZXhdy/GZ3ZmHRrV0HpW', // adminpassword
      role: 'safety_officer',
      created_at: new Date()
    },
    {
      id: 6,
      email: 'analyst@transitops.com',
      password: '$2a$10$VPoSK4JXQak5qemFj2s5sOj0wBm.H4xZv5ZXhdy/GZ3ZmHRrV0HpW', // adminpassword
      role: 'financial_analyst',
      created_at: new Date()
    }
  ],
  vehicles: [
    {
      id: 1,
      registration_number: 'VAN-01',
      model: 'Ford Transit',
      type: 'Van',
      max_capacity: 1200,
      odometer: 45000,
      acquisition_cost: 32000,
      status: 'Available',
      created_at: new Date()
    },
    {
      id: 2,
      registration_number: 'TRK-02',
      model: 'Volvo FH16',
      type: 'Truck',
      max_capacity: 18000,
      odometer: 120000,
      acquisition_cost: 95000,
      status: 'In Shop',
      created_at: new Date()
    }
  ],
  drivers: [
    {
      id: 1,
      name: 'Alex Johnson',
      license_number: 'DL-9921203',
      license_category: 'Heavy Truck',
      license_expiry_date: '2028-12-31',
      contact_number: '555-0199',
      safety_score: 95,
      status: 'Available',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Sarah Smith',
      license_number: 'DL-4819201',
      license_category: 'Light Commercial',
      license_expiry_date: '2027-06-15',
      contact_number: '555-0144',
      safety_score: 88,
      status: 'Off Duty',
      created_at: new Date()
    }
  ],
  trips: [],
  maintenance_logs: [],
  fuel_logs: [],
  expenses: []
};

const handleMockQuery = (text, params) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  console.log(`[Database Mock Query]: "${normalizedText}" | Params:`, params);
  
  if (normalizedText.includes('SELECT NOW()')) {
    return { rows: [{ now: new Date() }], rowCount: 1 };
  }

  // --- dynamic COUNT(*) Aggregate query interceptor ---
  if (normalizedText.includes('COUNT(*)')) {
    const tableMatch = normalizedText.match(/FROM\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
    const dbTable = mockDb[tableName] || mockDb[tableName + 's'];
    const records = dbTable || [];

    if (tableName === 'vehicles') {
      const total = records.length;
      const available = records.filter(v => v.status === 'Available').length;
      const active = records.filter(v => v.status === 'On Trip').length;
      const maintenance = records.filter(v => v.status === 'In Shop').length;
      const retired = records.filter(v => v.status === 'Retired').length;
      return {
        rows: [{ total, available, active, maintenance, retired }],
        rowCount: 1
      };
    }
    
    if (tableName === 'drivers') {
      const total = records.length;
      const available = records.filter(d => d.status === 'Available').length;
      const active = records.filter(d => d.status === 'On Trip').length;
      const off_duty = records.filter(d => d.status === 'Off Duty').length;
      const suspended = records.filter(d => d.status === 'Suspended').length;
      return {
        rows: [{ total, available, active, off_duty, suspended }],
        rowCount: 1
      };
    }

    if (tableName === 'trips') {
      const total = records.length;
      const draft = records.filter(t => t.status === 'Draft').length;
      const dispatched = records.filter(t => t.status === 'Dispatched' || t.status === 'On Trip').length;
      const completed = records.filter(t => t.status === 'Completed').length;
      const cancelled = records.filter(t => t.status === 'Cancelled').length;
      return {
        rows: [{ total, draft, dispatched, completed, cancelled }],
        rowCount: 1
      };
    }
  }

  // --- Dynamic INSERT Handler ---
  const insertMatch = normalizedText.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const tableName = insertMatch[1].toLowerCase();
    const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    const dbTable = mockDb[tableName] || mockDb[tableName + 's']; // support logs pluralization mapping
    
    if (!dbTable) {
      console.warn(`[Database Mock] Table '${tableName}' not found for INSERT`);
      return { rows: [], rowCount: 0 };
    }
    
    const newRecord = { id: dbTable.length + 1 };
    columns.forEach((col, index) => {
      let val = params[index];
      // Auto-parse JSON strings for metadata fields
      if (col === 'metadata' && typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      newRecord[col] = val;
    });
    newRecord.created_at = new Date();
    newRecord.updated_at = new Date();
    
    dbTable.push(newRecord);
    return { rows: [newRecord], rowCount: 1 };
  }

  // --- Dynamic UPDATE Handler ---
  const updateMatch = normalizedText.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+id\s*=\s*\$(\d+)/i);
  if (updateMatch) {
    const tableName = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const idParamIdx = parseInt(updateMatch[3], 10) - 1;
    const idVal = parseInt(params[idParamIdx], 10);
    const dbTable = mockDb[tableName] || mockDb[tableName + 's'];
    
    if (!dbTable) {
      console.warn(`[Database Mock] Table '${tableName}' not found for UPDATE`);
      return { rows: [], rowCount: 0 };
    }
    
    const recordIndex = dbTable.findIndex(r => r.id === idVal);
    if (recordIndex === -1) return { rows: [], rowCount: 0 };
    
    const assignments = setClause.split(',').map(a => a.trim());
    assignments.forEach(assign => {
      const parts = assign.split('=').map(p => p.trim());
      const col = parts[0].toLowerCase();
      const valStr = parts[1]; // E.g., "$1" or "'On Trip'"
      let val;
      if (valStr.startsWith('$')) {
        const paramIdx = parseInt(valStr.replace('$', ''), 10) - 1;
        val = params[paramIdx];
      } else {
        // String literal - strip quotes
        val = valStr.replace(/^['"]|['"]$/g, '');
      }
      // Auto-parse JSON metadata
      if (col === 'metadata' && typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      dbTable[recordIndex][col] = val;
    });
    
    dbTable[recordIndex].updated_at = new Date();
    return { rows: [dbTable[recordIndex]], rowCount: 1 };
  }

  // --- Dynamic DELETE Handler ---
  const deleteMatch = normalizedText.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+id\s*=\s*\$(\d+)/i);
  if (deleteMatch) {
    const tableName = deleteMatch[1].toLowerCase();
    const idParamIdx = parseInt(deleteMatch[2], 10) - 1;
    const idVal = parseInt(params[idParamIdx], 10);
    const dbTable = mockDb[tableName] || mockDb[tableName + 's'];
    
    if (!dbTable) {
      console.warn(`[Database Mock] Table '${tableName}' not found for DELETE`);
      return { rows: [], rowCount: 0 };
    }
    
    const recordIndex = dbTable.findIndex(r => r.id === idVal);
    if (recordIndex === -1) return { rows: [], rowCount: 0 };
    
    const deleted = dbTable.splice(recordIndex, 1);
    return { rows: deleted, rowCount: 1 };
  }

  // --- Dynamic SELECT Handler ---
  if (normalizedText.startsWith('SELECT')) {
    const tableMatch = normalizedText.match(/FROM\s+(\w+)/i);
    if (!tableMatch) {
      console.warn('[Database Mock] Could not parse table from SELECT query:', text);
      return { rows: [], rowCount: 0 };
    }
    
    const tableName = tableMatch[1].toLowerCase();
    const dbTable = mockDb[tableName] || mockDb[tableName + 's'];
    
    if (!dbTable) {
      console.warn(`[Database Mock] Table '${tableName}' not found for SELECT`);
      return { rows: [], rowCount: 0 };
    }
    
    let records = [...dbTable];
    
    const whereMatch = normalizedText.match(/WHERE\s+(.+)/i);
    const whereClause = whereMatch ? whereMatch[1] : '';
    
    if (whereClause) {
      // Basic param extraction & evaluation
      // Matches pattern "column = $index"
      const paramMatches = [...whereClause.matchAll(/(\w+)\s*=\s*\$(\d+)/gi)];
      paramMatches.forEach(m => {
        const col = m[1].toLowerCase();
        const paramIdx = parseInt(m[2], 10) - 1;
        const val = params[paramIdx];
        records = records.filter(r => {
          if (typeof val === 'boolean') {
            return (r[col] === val || (val === true && r[col] === 'true') || (val === false && r[col] === 'false'));
          }
          return String(r[col]) === String(val);
        });
      });

      // Matches pattern "id = $index"
      const idMatch = whereClause.match(/id\s*=\s*\$(\d+)/i);
      if (idMatch && !paramMatches.some(m => m[1].toLowerCase() === 'id')) {
        const paramIdx = parseInt(idMatch[1], 10) - 1;
        const val = parseInt(params[paramIdx], 10);
        records = records.filter(r => r.id === val);
      }

      // Matches unique fields like email or registration_number
      if (whereClause.includes('email = $1')) {
        records = records.filter(r => r.email === params[0]);
      }
      if (whereClause.includes('registration_number = $1')) {
        records = records.filter(r => r.registration_number === params[0]);
      }
      
      // Case-insensitive search match (ILIKE)
      const ilikeMatches = [...whereClause.matchAll(/\((?:i\.)?(\w+)\s+ILIKE\s+\$(\d+)\s+OR\s+(?:i\.)?(\w+)\s+ILIKE\s+\$(\d+)\)/gi)];
      if (ilikeMatches.length > 0) {
        ilikeMatches.forEach(m => {
          const col1 = m[1].toLowerCase();
          const pIdx1 = parseInt(m[2], 10) - 1;
          const searchVal = params[pIdx1].replace(/%/g, '').toLowerCase();
          records = records.filter(r => 
            (r[col1] && String(r[col1]).toLowerCase().includes(searchVal)) ||
            (r[m[3].toLowerCase()] && String(r[m[3].toLowerCase()]).toLowerCase().includes(searchVal))
          );
        });
      }
    }
    
    // Sort or Join mappings: Add creator_email, vehicle_name, driver_name
    records = records.map(r => {
      const creator = mockDb.users.find(u => u.id === r.created_by);
      const vehicle = mockDb.vehicles.find(v => v.id === r.vehicle_id);
      const driver = mockDb.drivers.find(d => d.id === r.driver_id);
      return { 
        ...r, 
        creator_email: creator ? creator.email : null,
        vehicle_name: vehicle ? vehicle.model : null,
        registration_number: vehicle ? vehicle.registration_number : (r.registration_number || null),
        driver_name: driver ? driver.name : null
      };
    });

    // Default sort by created_at DESC if present
    records.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    
    return { rows: records, rowCount: records.length };
  }
  
  console.warn('[Database Mock] Unhandled query pattern:', text);
  return { rows: [], rowCount: 0 };
};

const pool = new Pool(dbConfig);

// Pool event listeners for monitoring connection states
pool.on('connect', () => {
  console.log('[Database] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  if (!useMock) {
    console.error('[Database] Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
  }
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
    if (useMock) {
      return handleMockQuery(text, params);
    }
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
    if (useMock) {
      // Mock Transaction Client
      return {
        query: async (text, params) => handleMockQuery(text, params),
        release: () => {}
      };
    }
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
    let attempts = 3;
    while (attempts) {
      try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        console.log(`[Database] Database connection successful. Current time: ${res.rows[0].now}`);
        return true;
      } catch (err) {
        attempts -= 1;
        console.warn(`[Database] Connection failed. (${attempts} attempts left)`);
        console.warn(`[Database] Error: ${err.message}`);
        if (attempts === 0) {
          console.warn('[Database] Switching to IN-MEMORY MOCK DATABASE MODE (PostgreSQL not running)');
          useMock = true;
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  },

  // Close pool (useful for test tear-downs)
  close: () => pool.end()
};
