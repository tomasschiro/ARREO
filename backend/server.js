require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const authRoutes            = require('./routes/auth');
const { router: viajesRouter, misViajes, misAplicaciones } = require('./routes/viajes');
const { router: dispRouter, misDisponibilidades }          = require('./routes/disponibilidades');
const mensajesRouter        = require('./routes/mensajes');
const transportistasRouter  = require('./routes/transportistas');
const reseñasRouter         = require('./routes/reseñas');
const adminRouter           = require('./routes/admin.routes');
const authMiddleware        = require('./middleware/auth');
const adminAuth             = require('./middleware/adminAuth');
const createTrackingRouter  = require('./routes/tracking');
const { iniciarReminderViajes } = require('./services/email.service');
const pool                  = require('./database/connect');

const app = express();
const httpServer = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.on('join_viaje', (viajeId) => {
    socket.join(`viaje_${viajeId}`);
  });
  socket.on('leave_viaje', (viajeId) => {
    socket.leave(`viaje_${viajeId}`);
  });
});

app.use(cors({ origin: frontendUrl }));
app.use(bodyParser.json({ limit: '50mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',            authRoutes);
app.use('/api/viajes',          viajesRouter);
app.use('/api/viajes',          createTrackingRouter(io));
app.use('/api/disponibilidades', dispRouter);
app.use('/api/mensajes',        mensajesRouter);
app.use('/api/transportistas',  transportistasRouter);
app.use('/api/reseñas',         reseñasRouter);
app.use('/api/admin',           authMiddleware, adminAuth, adminRouter);

app.get('/api/mis-viajes',           authMiddleware, misViajes);
app.get('/api/mis-aplicaciones',     authMiddleware, misAplicaciones);
app.get('/api/mis-disponibilidades', authMiddleware, misDisponibilidades);

// Endpoint público de seguimiento (sin auth, solo con token)
app.get('/api/seguimiento/:token', async (req, res) => {
  try {
    const { rows: [v] } = await pool.query(
      `SELECT id, origen, destino, fecha_salida, tipo_hacienda, cantidad_cabezas,
              origen_lat, origen_lng, destino_lat, destino_lng,
              ubicacion_lat, ubicacion_lng, ubicacion_actualizada_en, estado
       FROM viajes WHERE link_seguimiento = $1`,
      [req.params.token]
    );
    if (!v) return res.status(404).json({ error: 'Link de seguimiento inválido o expirado' });
    res.json({ viaje: v });
  } catch (err) {
    console.error('[seguimiento]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function runMigrations() {
  await pool.query(`ALTER TABLE viajes DROP COLUMN IF EXISTS categoria`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS condicion_camino VARCHAR(50)`);
  // Documentos transportista
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_linti TEXT`);
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_seguro TEXT`);
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_senasa TEXT`);
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_vtv TEXT`);
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS declaracion_jurada BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS declaracion_jurada_fecha TIMESTAMPTZ`);
  // RENSPA
  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS renspa VARCHAR(20)`);
  // Documentación por viaje
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS dte_numero VARCHAR(50)`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS guia_provincial_numero VARCHAR(50)`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS documentacion_cargada BOOLEAN DEFAULT false`);
  // Seguimiento en tiempo real
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS ubicacion_lat DECIMAL(10,8)`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS ubicacion_lng DECIMAL(11,8)`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS ubicacion_actualizada_en TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS link_seguimiento VARCHAR(100)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'viajes_link_seguimiento_unique'
      ) THEN
        ALTER TABLE viajes ADD CONSTRAINT viajes_link_seguimiento_unique UNIQUE (link_seguimiento);
      END IF;
    END $$
  `);
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  runMigrations().catch(e => console.error('[migration]', e.message));
  iniciarReminderViajes(pool);
});
