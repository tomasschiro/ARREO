const { Router } = require('express');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');

const router = Router();

// POST /api/disponibilidades — crear
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas pueden publicar disponibilidad' });
  }

  const estadoUsuario = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [req.user.id]);
  if (estadoUsuario.rows[0]?.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
  }

  const { origen_lat, origen_lng, origen_direccion, destino_lat, destino_lng, destino_direccion, fecha, tipo_jaula } = req.body ?? {};

  if (!origen_direccion || !destino_direccion || !fecha || !tipo_jaula) {
    return res.status(400).json({ error: 'origen, destino, fecha y tipo de jaula son obligatorios' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO disponibilidades
         (transportista_id, origen_lat, origen_lng, origen_direccion, destino_lat, destino_lng, destino_direccion, fecha, tipo_jaula)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [req.user.id, origen_lat || null, origen_lng || null, origen_direccion,
       destino_lat || null, destino_lng || null, destino_direccion, fecha, tipo_jaula]
    );
    res.status(201).json({ disponibilidad: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/disponibilidades — listar activas con datos del camión
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*,
              u.id AS transportista_id,
              u.nombre AS transportista_nombre,
              u.zona AS transportista_zona,
              u.tipo_remolque,
              u.capacidad_kg,
              u.puntuacion_promedio,
              u.cantidad_reseñas
       FROM disponibilidades d
       JOIN usuarios u ON u.id = d.transportista_id
       WHERE d.estado = 'disponible' AND d.fecha >= CURRENT_DATE
       ORDER BY d.fecha ASC`
    );
    res.json({ disponibilidades: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/disponibilidades/publicas — sin auth, solo count de disponibilidades activas
router.get('/publicas', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM disponibilidades
       WHERE estado = 'disponible' AND fecha >= CURRENT_DATE`
    );
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/disponibilidades/:id — editar
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas pueden editar disponibilidades' });
  }
  const { fecha, tipo_jaula } = req.body ?? {};
  if (!fecha || !tipo_jaula) {
    return res.status(400).json({ error: 'fecha y tipo_jaula son obligatorios' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE disponibilidades SET fecha = $1, tipo_jaula = $2
       WHERE id = $3 AND transportista_id = $4
       RETURNING *`,
      [fecha, tipo_jaula, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.json({ disponibilidad: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/mis-disponibilidades — incluye interesados (mensajes por disponibilidad)
async function misDisponibilidades(req, res) {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas tienen disponibilidades' });
  }
  try {
    const { rows: disps } = await pool.query(
      `SELECT * FROM disponibilidades WHERE transportista_id = $1 ORDER BY fecha DESC`,
      [req.user.id]
    );

    const ids = disps.map(d => d.id);
    let mensajes = [];
    if (ids.length > 0) {
      const { rows } = await pool.query(
        `SELECT m.*, u.nombre AS remitente_nombre, u.email AS remitente_email
         FROM mensajes m
         JOIN usuarios u ON u.id = m.remitente_id
         WHERE m.disponibilidad_id = ANY($1::int[])
         ORDER BY m.created_at DESC`,
        [ids]
      );
      mensajes = rows;
    }

    const result = disps.map(d => ({
      ...d,
      interesados: mensajes.filter(m => m.disponibilidad_id === d.id),
    }));

    res.json({ disponibilidades: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { router, misDisponibilidades };
