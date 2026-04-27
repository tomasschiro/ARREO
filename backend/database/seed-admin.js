// Crea el usuario superadmin inicial.
// Agrega las columnas faltantes antes de insertar.
// Ejecutar: node database/seed-admin.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const pool = require('./connect');

async function main() {
  // 1. Agregar valor 'superadmin' al enum (debe ir fuera de transacción)
  await pool.query(`ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin'`);
  console.log('✓ Enum rol_usuario verificado');

  // 2. Agregar columnas faltantes (idempotente con IF NOT EXISTS)
  await pool.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS estado          VARCHAR(20)    DEFAULT 'aprobado',
      ADD COLUMN IF NOT EXISTS aprobado_en     TIMESTAMP,
      ADD COLUMN IF NOT EXISTS aprobado_por    INTEGER,
      ADD COLUMN IF NOT EXISTS cuit_cuil          VARCHAR(20),
      ADD COLUMN IF NOT EXISTS cuit_verificado    BOOLEAN        DEFAULT false,
      ADD COLUMN IF NOT EXISTS patente            VARCHAR(20),
      ADD COLUMN IF NOT EXISTS marca_camion       VARCHAR(100),
      ADD COLUMN IF NOT EXISTS modelo_camion      VARCHAR(100),
      ADD COLUMN IF NOT EXISTS año_camion         INTEGER,
      ADD COLUMN IF NOT EXISTS tipo_remolque      VARCHAR(50),
      ADD COLUMN IF NOT EXISTS capacidad_kg       INTEGER,
      ADD COLUMN IF NOT EXISTS puntuacion_promedio DECIMAL(3,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cantidad_reseñas   INTEGER       DEFAULT 0,
      ADD COLUMN IF NOT EXISTS foto_dni_frente    TEXT,
      ADD COLUMN IF NOT EXISTS foto_dni_dorso     TEXT,
      ADD COLUMN IF NOT EXISTS foto_licencia      TEXT,
      ADD COLUMN IF NOT EXISTS foto_camion        TEXT,
      ADD COLUMN IF NOT EXISTS motivo_rechazo     TEXT
  `);
  console.log('✓ Columnas verificadas/agregadas');

  // 3. Insertar superadmin
  const hash = await bcrypt.hash('arreo2024admin', 10);
  const { rowCount } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, estado)
     VALUES ('Admin ARREO', 'admin@arreo.com', $1, 'superadmin', 'aprobado')
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  if (rowCount > 0) {
    console.log('✓ Superadmin creado exitosamente');
    console.log('  Email:    admin@arreo.com');
    console.log('  Password: arreo2024admin');
  } else {
    console.log('ℹ El superadmin ya existe (admin@arreo.com)');
  }
  process.exit(0);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
