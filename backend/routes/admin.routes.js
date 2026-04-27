const { Router } = require('express');
const pool = require('../database/connect');
const {
  emailTransportistaAprobado,
  emailProductorAprobado,
  emailCuentaRechazada,
} = require('../services/email.service');

const router = Router();

// ─── MÉTRICAS ─────────────────────────────────────────────────────────────────

// GET /api/admin/metricas
router.get('/metricas', async (_req, res) => {
  try {
    const [usuarios, viajes, otros] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE rol = 'transportista')  AS total_transportistas,
          COUNT(*) FILTER (WHERE rol = 'productor')      AS total_productores,
          COUNT(*) FILTER (WHERE rol = 'consignataria')  AS total_consignatarias,
          COUNT(*) FILTER (WHERE estado = 'pendiente' AND rol != 'superadmin') AS pendientes_aprobacion,
          COUNT(*) FILTER (WHERE estado = 'suspendido') AS suspendidos,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND rol != 'superadmin') AS nuevos_7_dias
        FROM usuarios
        WHERE rol != 'superadmin'
      `),
      pool.query(`
        SELECT
          COUNT(*)                                             AS total_viajes,
          COUNT(*) FILTER (WHERE estado = 'disponible')       AS viajes_disponibles,
          COUNT(*) FILTER (WHERE estado = 'con_ofertas')      AS viajes_con_ofertas,
          COUNT(*) FILTER (WHERE estado = 'completo')         AS viajes_completos,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS viajes_7_dias
        FROM viajes
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM aplicaciones)    AS total_aplicaciones,
          (SELECT COUNT(*) FROM disponibilidades) AS total_disponibilidades,
          (SELECT COUNT(*) FROM mensajes)         AS total_mensajes,
          (SELECT COUNT(*) FROM reseñas)          AS total_reseñas
      `),
    ]);

    res.json({
      ...usuarios.rows[0],
      ...viajes.rows[0],
      ...otros.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

// GET /api/admin/usuarios?rol=&estado=&q=
router.get('/usuarios', async (req, res) => {
  const { rol, estado, q } = req.query;
  const condiciones = ["u.rol != 'superadmin'"];
  const valores = [];

  if (rol) {
    valores.push(rol);
    condiciones.push(`u.rol = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`u.estado = $${valores.length}`);
  }
  if (q) {
    valores.push(`%${q}%`);
    condiciones.push(`(u.nombre ILIKE $${valores.length} OR u.email ILIKE $${valores.length})`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.estado, u.zona, u.telefono,
              u.cuit_cuil, u.patente, u.marca_camion, u.modelo_camion, u.año_camion,
              u.tipo_remolque, u.capacidad_kg,
              u.foto_dni_frente, u.foto_dni_dorso, u.foto_licencia, u.foto_camion,
              u.motivo_rechazo,
              u.puntuacion_promedio, u.cantidad_reseñas,
              u.created_at, u.aprobado_en,
              a.nombre AS aprobado_por_nombre
       FROM usuarios u
       LEFT JOIN usuarios a ON a.id = u.aprobado_por
       WHERE ${condiciones.join(' AND ')}
       ORDER BY u.created_at DESC`,
      valores
    );
    res.json({ usuarios: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/admin/usuarios/:id
router.get('/usuarios/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*,
              a.nombre AS aprobado_por_nombre,
              (SELECT COUNT(*) FROM viajes WHERE usuario_id = u.id)::int AS total_viajes,
              (SELECT COUNT(*) FROM disponibilidades WHERE transportista_id = u.id)::int AS total_disponibilidades,
              (SELECT COUNT(*) FROM aplicaciones WHERE transportista_id = u.id)::int AS total_aplicaciones
       FROM usuarios u
       LEFT JOIN usuarios a ON a.id = u.aprobado_por
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_hash, ...datos } = rows[0];
    res.json({ usuario: datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/admin/usuarios/:id/aprobar
router.put('/usuarios/:id/aprobar', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET estado = 'aprobado', aprobado_en = NOW(), aprobado_por = $1
       WHERE id = $2 AND rol != 'superadmin'
       RETURNING id, nombre, email, rol, estado, aprobado_en`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: rows[0] });

    const u = rows[0];
    if (u.rol === 'transportista') {
      emailTransportistaAprobado(u.nombre, u.email).catch(() => {});
    } else {
      emailProductorAprobado(u.nombre, u.email).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/admin/usuarios/:id/rechazar
router.put('/usuarios/:id/rechazar', async (req, res) => {
  const { motivo } = req.body ?? {};
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET estado = 'rechazado', motivo_rechazo = $1
       WHERE id = $2 AND rol != 'superadmin'
       RETURNING id, nombre, email, rol, estado, motivo_rechazo`,
      [motivo || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: rows[0] });

    const u = rows[0];
    emailCuentaRechazada(u.nombre, u.email, u.motivo_rechazo).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/admin/usuarios/:id/suspender
router.put('/usuarios/:id/suspender', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET estado = 'suspendido'
       WHERE id = $1 AND rol != 'superadmin'
       RETURNING id, nombre, email, rol, estado`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/admin/usuarios/:id/activar
router.put('/usuarios/:id/activar', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET estado = 'aprobado', aprobado_en = NOW(), aprobado_por = $1
       WHERE id = $2 AND rol != 'superadmin'
       RETURNING id, nombre, email, rol, estado`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/admin/usuarios/:id
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM usuarios WHERE id = $1 AND rol != 'superadmin' RETURNING id, nombre, email`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ eliminado: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── VIAJES ───────────────────────────────────────────────────────────────────

// GET /api/admin/viajes
router.get('/viajes', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, u.nombre AS publicado_por, u.email AS publicado_email, u.rol AS publicado_rol,
              (SELECT COUNT(*) FROM aplicaciones a WHERE a.viaje_id = v.id)::int AS total_aplicaciones
       FROM viajes v
       JOIN usuarios u ON u.id = v.usuario_id
       ORDER BY v.created_at DESC`
    );
    res.json({ viajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/admin/viajes/:id
router.delete('/viajes/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM viajes WHERE id = $1 RETURNING id, origen, destino`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json({ eliminado: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DISPONIBILIDADES ────────────────────────────────────────────────────────

// GET /api/admin/disponibilidades
router.get('/disponibilidades', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.nombre AS transportista_nombre, u.email AS transportista_email
       FROM disponibilidades d
       JOIN usuarios u ON u.id = d.transportista_id
       ORDER BY d.created_at DESC`
    );
    res.json({ disponibilidades: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/admin/disponibilidades/:id
router.delete('/disponibilidades/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM disponibilidades WHERE id = $1 RETURNING id, origen_direccion, destino_direccion`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.json({ eliminada: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────

// GET /api/admin/reseñas
router.get('/reseñas', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              t.nombre AS transportista_nombre, t.email AS transportista_email,
              p.nombre AS productor_nombre,     p.email AS productor_email
       FROM reseñas r
       JOIN usuarios t ON t.id = r.transportista_id
       JOIN usuarios p ON p.id = r.productor_id
       ORDER BY r.created_at DESC`
    );
    res.json({ reseñas: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/admin/reseñas/:id
router.delete('/reseñas/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM reseñas WHERE id = $1 RETURNING id, transportista_id, puntuacion`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Reseña no encontrada' });

    // Recalcular stats del transportista
    await pool.query(
      `UPDATE usuarios SET
         cantidad_reseñas    = (SELECT COUNT(*)    FROM reseñas WHERE transportista_id = $1),
         puntuacion_promedio = COALESCE((SELECT AVG(puntuacion) FROM reseñas WHERE transportista_id = $1), 0)
       WHERE id = $1`,
      [rows[0].transportista_id]
    );

    res.json({ eliminada: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
