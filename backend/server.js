require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes            = require('./routes/auth');
const { router: viajesRouter, misViajes, misAplicaciones } = require('./routes/viajes');
const { router: dispRouter, misDisponibilidades }          = require('./routes/disponibilidades');
const mensajesRouter        = require('./routes/mensajes');
const transportistasRouter  = require('./routes/transportistas');
const reseñasRouter         = require('./routes/reseñas');
const adminRouter           = require('./routes/admin.routes');
const authMiddleware        = require('./middleware/auth');
const adminAuth             = require('./middleware/adminAuth');
const { iniciarReminderViajes } = require('./services/email.service');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',            authRoutes);
app.use('/api/viajes',          viajesRouter);
app.use('/api/disponibilidades', dispRouter);
app.use('/api/mensajes',        mensajesRouter);
app.use('/api/transportistas',  transportistasRouter);
app.use('/api/reseñas',         reseñasRouter);
app.use('/api/admin',           authMiddleware, adminAuth, adminRouter);

app.get('/api/mis-viajes',           authMiddleware, misViajes);
app.get('/api/mis-aplicaciones',     authMiddleware, misAplicaciones);
app.get('/api/mis-disponibilidades', authMiddleware, misDisponibilidades);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const pool = require('./database/connect');

async function runMigrations() {
  await pool.query(`ALTER TABLE viajes DROP COLUMN IF EXISTS categoria`);
  await pool.query(`ALTER TABLE viajes ADD COLUMN IF NOT EXISTS condicion_camino VARCHAR(50)`);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  runMigrations().catch(e => console.error('[migration]', e.message));
  iniciarReminderViajes(pool);
});
