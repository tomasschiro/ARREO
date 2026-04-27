const { Router } = require('express');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');

const router = Router();

// POST /api/reseñas — solo productores/consignatarias que tuvieron una aplicación aceptada
router.post('/', authMiddleware, async (req, res) => {
  if (!['productor', 'consignataria'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Solo productores o consignatarias pueden dejar reseñas' });
  }

  const { transportista_id, puntuacion, comentario } = req.body ?? {};

  if (!transportista_id || !puntuacion) {
    return res.status(400).json({ error: 'transportista_id y puntuacion son obligatorios' });
  }
  if (puntuacion < 1 || puntuacion > 5) {
    return res.status(400).json({ error: 'La puntuacion debe ser entre 1 y 5' });
  }

  try {
    const check = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM aplicaciones a
         JOIN viajes v ON v.id = a.viaje_id
         WHERE a.transportista_id = $1
           AND v.usuario_id = $2
           AND a.estado = 'aceptada'
       ) AS puede`,
      [transportista_id, req.user.id]
    );
    if (!check.rows[0].puede) {
      return res.status(403).json({ error: 'Solo podés reseñar transportistas que hayas contratado' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reseñas (transportista_id, productor_id, puntuacion, comentario)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [transportista_id, req.user.id, puntuacion, comentario || null]
    );

    await pool.query(
      `UPDATE usuarios SET
         puntuacion_promedio = (SELECT AVG(puntuacion) FROM reseñas WHERE transportista_id = $1),
         cantidad_reseñas    = (SELECT COUNT(*)        FROM reseñas WHERE transportista_id = $1)
       WHERE id = $1`,
      [transportista_id]
    );

    res.status(201).json({ reseña: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya dejaste una reseña para este transportista' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
