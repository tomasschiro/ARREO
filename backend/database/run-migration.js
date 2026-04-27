require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'migrate-neon.sql'), 'utf8');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Conectado a Neon. Ejecutando migraciones...\n');

  try {
    await client.query(sql);
    console.log('✓ Migración completada exitosamente.');
  } catch (err) {
    console.error('✗ Error durante la migración:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
