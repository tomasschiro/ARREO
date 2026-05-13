// Crea 3 usuarios de prueba con datos realistas de Entre Ríos y Corrientes.
// Si ya existen, los actualiza (ON CONFLICT DO UPDATE).
// Ejecutar: node database/seed-usuarios-prueba.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const pool = require('./connect');

const USUARIOS = [
  {
    nombre:    'Carlos Mendoza',
    email:     'productor@arreo.com',
    password:  'arreo2024',
    rol:       'productor',
    zona:      'Concordia, Entre Ríos',
    telefono:  '3454123456',
    cuit_cuil: '20-28456789-3',
    renspa:    '08.069.1.00123/01',
    estado:    'aprobado',
  },
  {
    nombre:    'María González - Consignataria del Litoral',
    email:     'consignataria@arreo.com',
    password:  'arreo2024',
    rol:       'consignataria',
    zona:      'Paraná, Entre Ríos',
    telefono:  '3434567890',
    cuit_cuil: '30-71234567-9',
    renspa:    '06.058.0.00456/02',
    estado:    'aprobado',
  },
  {
    nombre:              'Roberto Sánchez',
    email:               'transportista@arreo.com',
    password:            'arreo2024',
    rol:                 'transportista',
    zona:                'Gualeguaychú, Entre Ríos',
    telefono:            '3446789012',
    cuit_cuil:           '20-31567890-4',
    patente:             'AB 123 CD',
    marca_camion:        'Mercedes Benz',
    modelo_camion:       'Atego 1725',
    año_camion:          2019,
    tipo_remolque:       'Acoplado, Semirremolque',
    capacidad_kg:        14000,
    puntuacion_promedio: 4.5,
    cantidad_reseñas:    12,
    estado:              'aprobado',
  },
];

async function main() {
  console.log('ARREO — Seed de usuarios de prueba\n');

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (
         nombre, email, password_hash, rol, zona, telefono,
         cuit_cuil, renspa,
         patente, marca_camion, modelo_camion, año_camion,
         tipo_remolque, capacidad_kg,
         puntuacion_promedio, cantidad_reseñas,
         estado
       ) VALUES (
         $1,  $2,  $3,  $4,  $5,  $6,
         $7,  $8,
         $9,  $10, $11, $12,
         $13, $14,
         $15, $16,
         $17
       )
       ON CONFLICT (email) DO UPDATE SET
         nombre               = EXCLUDED.nombre,
         password_hash        = EXCLUDED.password_hash,
         rol                  = EXCLUDED.rol,
         zona                 = EXCLUDED.zona,
         telefono             = EXCLUDED.telefono,
         cuit_cuil            = EXCLUDED.cuit_cuil,
         renspa               = EXCLUDED.renspa,
         patente              = EXCLUDED.patente,
         marca_camion         = EXCLUDED.marca_camion,
         modelo_camion        = EXCLUDED.modelo_camion,
         año_camion           = EXCLUDED.año_camion,
         tipo_remolque        = EXCLUDED.tipo_remolque,
         capacidad_kg         = EXCLUDED.capacidad_kg,
         puntuacion_promedio  = EXCLUDED.puntuacion_promedio,
         cantidad_reseñas     = EXCLUDED.cantidad_reseñas,
         estado               = EXCLUDED.estado
       RETURNING id, nombre, email, rol, (xmax = 0) AS fue_creado`,
      [
        u.nombre,              // $1
        u.email,               // $2
        hash,                  // $3
        u.rol,                 // $4
        u.zona   ?? null,      // $5
        u.telefono ?? null,    // $6
        u.cuit_cuil ?? null,   // $7
        u.renspa ?? null,      // $8
        u.patente ?? null,     // $9
        u.marca_camion ?? null,  // $10
        u.modelo_camion ?? null, // $11
        u.año_camion ?? null,    // $12
        u.tipo_remolque ?? null, // $13
        u.capacidad_kg ?? null,  // $14
        u.puntuacion_promedio ?? 0, // $15
        u.cantidad_reseñas ?? 0,    // $16
        u.estado,              // $17
      ]
    );

    const row = rows[0];
    const accion = row.fue_creado ? 'creado   ' : 'actualizado';
    console.log(`✓ [${row.rol.padEnd(13)}] ${accion}  →  ${row.email}  (id: ${row.id})`);
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('Credenciales de acceso:');
  console.log('');
  for (const u of USUARIOS) {
    console.log(`  ${u.rol.padEnd(13)}  ${u.email.padEnd(30)}  password: ${u.password}`);
  }
  console.log('─────────────────────────────────────────────────');

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
