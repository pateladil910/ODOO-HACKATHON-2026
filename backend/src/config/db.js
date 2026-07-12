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
      password: '$2a$10$yvE314.yH1m1oJ7s37eWseF.T30DdQgDk0q7Xy3.z.l7dY/Z7V0XW', // adminpassword
      role: 'admin',
      created_at: new Date()
    },
    {
      id: 2,
      email: 'user@hackathon.com',
      password: '$2a$10$n7/n5Z/2X9vj7R.y4s3lEuM5L0f10e4t.i.l8y3.z.l7dY/Z7V0XW', // userpassword
      role: 'user',
      created_at: new Date()
    }
  ],
  items: [
    {
      id: 1,
      title: 'Boilerplate API Configured',
      description: 'The Express backend connection to PostgreSQL is fully functional and Docker compose setup is complete.',
      is_active: true,
      metadata: '{"category": "infrastructure", "tags": ["docker", "postgres", "node"]}',
      created_by: 1,
      created_at: new Date()
    },
    {
      id: 2,
      title: 'Responsive Frontend Template Ready',
      description: 'HTML5, CSS3, and Vanilla JS UI boilerplate is structured and ready for customizing colors, tabs, and forms.',
      is_active: true,
      metadata: '{"category": "design", "tags": ["vanilla-js", "responsive", "css-variables"]}',
      created_by: 1,
      created_at: new Date()
    },
    {
      id: 3,
      title: 'Draft Concept Item',
      description: 'This is an inactive item illustrating how logical filters work on backend endpoints.',
      is_active: false,
      metadata: '{"category": "concept", "tags": ["draft"]}',
      created_by: 2,
      created_at: new Date()
    }
  ]
};

const handleMockQuery = (text, params) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (normalizedText.includes('SELECT NOW()')) {
    return { rows: [{ now: new Date() }], rowCount: 1 };
  }
  
  // Find User by email
  if (normalizedText.includes('SELECT * FROM users WHERE email =')) {
    const email = params[0];
    const user = mockDb.users.find(u => u.email === email);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  // Create User
  if (normalizedText.includes('INSERT INTO users')) {
    const newUser = {
      id: mockDb.users.length + 1,
      email: params[0],
      password: params[1],
      role: params[2] || 'user',
      created_at: new Date()
    };
    mockDb.users.push(newUser);
    const retUser = { id: newUser.id, email: newUser.email, role: newUser.role, created_at: newUser.created_at };
    return { rows: [retUser], rowCount: 1 };
  }
  
  // Find Item by ID
  if (normalizedText.includes('SELECT i.*, u.email as creator_email') && normalizedText.includes('WHERE i.id =')) {
    const id = params[0];
    const item = mockDb.items.find(i => i.id === id);
    if (!item) return { rows: [], rowCount: 0 };
    const user = mockDb.users.find(u => u.id === item.created_by);
    return { rows: [{ ...item, creator_email: user ? user.email : null }], rowCount: 1 };
  }
  
  // Find All Items with dynamic filters
  if (normalizedText.includes('SELECT i.*, u.email as creator_email') && normalizedText.includes('FROM items i')) {
    let filtered = mockDb.items.map(item => {
      const user = mockDb.users.find(u => u.id === item.created_by);
      return { ...item, creator_email: user ? user.email : null };
    });
    
    // We check where parameter indexes are mapped to filter values
    // To keep it simple, we inspect normalizedText and dynamic values
    let paramIdx = 0;
    
    // Check is_active filter
    if (normalizedText.includes('i.is_active =')) {
      const activeVal = params[paramIdx++];
      filtered = filtered.filter(i => i.is_active === activeVal);
    }
    
    // Check created_by filter
    if (normalizedText.includes('i.created_by =')) {
      const createdByVal = params[paramIdx++];
      filtered = filtered.filter(i => i.created_by === createdByVal);
    }
    
    // Check search filter
    if (normalizedText.includes('i.title ILIKE') || normalizedText.includes('description ILIKE')) {
      const searchVal = params[paramIdx++].replace(/%/g, '').toLowerCase();
      filtered = filtered.filter(i => 
        (i.title && i.title.toLowerCase().includes(searchVal)) || 
        (i.description && i.description.toLowerCase().includes(searchVal))
      );
    }
    
    // Sort by created_at DESC
    filtered.sort((a, b) => b.created_at - a.created_at);
    
    return { rows: filtered, rowCount: filtered.length };
  }
  
  // Create Item
  if (normalizedText.includes('INSERT INTO items')) {
    const newItem = {
      id: mockDb.items.length + 1,
      title: params[0],
      description: params[1],
      is_active: params[2] !== undefined ? params[2] : true,
      metadata: typeof params[3] === 'string' ? params[3] : JSON.stringify(params[3] || {}),
      created_by: params[4],
      created_at: new Date()
    };
    mockDb.items.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }
  
  // Update Item
  if (normalizedText.includes('UPDATE items')) {
    const id = params[4];
    const itemIndex = mockDb.items.findIndex(i => i.id === id);
    if (itemIndex === -1) return { rows: [], rowCount: 0 };
    mockDb.items[itemIndex] = {
      ...mockDb.items[itemIndex],
      title: params[0],
      description: params[1],
      is_active: params[2],
      metadata: typeof params[3] === 'string' ? params[3] : JSON.stringify(params[3] || {})
    };
    return { rows: [mockDb.items[itemIndex]], rowCount: 1 };
  }
  
  // Delete Item
  if (normalizedText.includes('DELETE FROM items')) {
    const id = params[0];
    const itemIndex = mockDb.items.findIndex(i => i.id === id);
    if (itemIndex === -1) return { rows: [], rowCount: 0 };
    const deleted = mockDb.items.splice(itemIndex, 1);
    return { rows: [deleted[0]], rowCount: 1 };
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
