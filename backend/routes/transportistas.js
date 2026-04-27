const { Router } = require('express');
const pool = require('../database/connect');

const router = Router();

// GET /api/transportistas/:id — perfil público con reseñas
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, zona, patente, marca_camion, modelo_camion, año_camion,
              tipo_remolque, capacidad_kg, foto_camion_url,
              puntuacion_promedio, cantidad_reseñas
       FROM usuarios WHERE id = $1 AND rol = 'transportista'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Transportista no encontrado' });

    const { rows: reseñas } = await pool.query(
      `SELECT r.id, r.puntuacion, r.comentario, r.created_at,
              u.nombre AS productor_nombre
       FROM reseñas r
       JOIN usuarios u ON u.id = r.productor_id
       WHERE r.transportista_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({ transportista: rows[0], reseñas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
