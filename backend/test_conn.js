const { Client } = require('pg');

const passwords = ['postgres_password', 'adil@9106'];

async function test() {
  for (const pwd of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pwd,
      database: 'postgres'
    });
    try {
      await client.connect();
      console.log(`Connection successful with password: ${pwd}`);
      const res = await client.query('SELECT current_database(), NOW()');
      console.log('Query result:', res.rows[0]);
      await client.end();
      return;
    } catch (e) {
      console.log(`Failed with password: ${pwd}. Error:`, e);
    }
  }
}

test();
