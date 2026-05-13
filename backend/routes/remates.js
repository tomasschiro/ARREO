const { Router } = require('express');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');
const {
  emailRematePublicado,
  emailRemateLoteVendido,
  emailRemateAlertaPlazoCercano,
  emailRemateCerrado,
  emailRemateLoteAbiertoZona,
} = require('../services/email.service');

const router = Router();

// ─── GET /api/remates — lista pública (publicado/en_curso/cerrado) ─────────────
router.get('/', async (req, res) => {
  const { zona } = req.query;
  const condiciones = ["r.estado IN ('publicado','en_curso','cerrado')"];
  const valores = [];

  if (zona) {
    valores.push(`%${zona}%`);
    condiciones.push(`r.zona ILIKE $${valores.length}`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.nombre AS consignataria_nombre,
         (SELECT COUNT(*) FROM remate_lotes l WHERE l.remate_id = r.id)::int AS total_lotes,
         (SELECT COUNT(*) FROM remate_transportistas rt WHERE rt.remate_id = r.id)::int AS total_transportistas,
         (SELECT COUNT(*) FROM remate_lotes l WHERE l.remate_id = r.id AND l.viaje_id IS NOT NULL)::int AS lotes_con_viaje
       FROM remates r
       JOIN usuarios u ON u.id = r.consignataria_id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY r.fecha ASC`,
      valores
    );
    res.json({ remates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/remates/mis-remates — remates de la consignataria logueada ───────
router.get('/mis-remates', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'consignataria') {
    return res.status(403).json({ error: 'Solo consignatarias' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
         (SELECT COUNT(*) FROM remate_lotes l WHERE l.remate_id = r.id)::int AS total_lotes,
         (SELECT COUNT(*) FROM remate_transportistas rt WHERE rt.remate_id = r.id)::int AS total_transportistas,
         (SELECT COUNT(*) FROM remate_lotes l WHERE l.remate_id = r.id AND l.viaje_id IS NOT NULL)::int AS lotes_con_viaje
       FROM remates r
       WHERE r.consignataria_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ remates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/remates — crear remate ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'consignataria') {
    return res.status(403).json({ error: 'Solo consignatarias pueden crear remates' });
  }

  const estadoUsr = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [req.user.id]);
  if (estadoUsr.rows[0]?.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
  }

  const {
    nombre, tipo, fecha,
    lugar_direccion, lugar_lat, lugar_lng,
    zona, descripcion, plazo_coordinacion,
  } = req.body;

  if (!nombre || !tipo || !fecha) {
    return res.status(400).json({ error: 'nombre, tipo y fecha son obligatorios' });
  }

  let plazo = plazo_coordinacion;
  if (!plazo) {
    const d = new Date(fecha);
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    plazo = d.toISOString();
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO remates
         (nombre, tipo, fecha, lugar_direccion, lugar_lat, lugar_lng, zona, descripcion, plazo_coordinacion, consignataria_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [nombre, tipo, fecha, lugar_direccion || null, lugar_lat || null, lugar_lng || null,
       zona || null, descripcion || null, plazo, req.user.id]
    );
    res.status(201).json({ remate: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/remates/:id — detalle ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query(
      `SELECT r.*, u.nombre AS consignataria_nombre, u.email AS consignataria_email
       FROM remates r
       JOIN usuarios u ON u.id = r.consignataria_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });

    const { rows: lotes } = await pool.query(
      `SELECT l.*, u.nombre AS transportista_asignado_nombre
       FROM remate_lotes l
       LEFT JOIN usuarios u ON u.id = l.transportista_asignado_id
       WHERE l.remate_id = $1
       ORDER BY l.created_at ASC`,
      [req.params.id]
    );

    const { rows: transportistas } = await pool.query(
      `SELECT rt.id, rt.tipo_remolque, rt.estado, rt.created_at,
              u.id AS transportista_id, u.nombre, u.zona, u.capacidad_kg,
              u.puntuacion_promedio, u.cantidad_reseñas
       FROM remate_transportistas rt
       JOIN usuarios u ON u.id = rt.transportista_id
       WHERE rt.remate_id = $1
       ORDER BY u.puntuacion_promedio DESC NULLS LAST, rt.created_at ASC`,
      [req.params.id]
    );

    res.json({ remate, lotes, transportistas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id — editar remate ─────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: [r] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Remate no encontrado' });
    if (r.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede editar el remate' });
    }

    const {
      nombre, tipo, fecha, lugar_direccion, lugar_lat, lugar_lng,
      zona, descripcion, plazo_coordinacion,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE remates SET
         nombre = COALESCE($1, nombre),
         tipo = COALESCE($2, tipo),
         fecha = COALESCE($3, fecha),
         lugar_direccion = COALESCE($4, lugar_direccion),
         lugar_lat = COALESCE($5, lugar_lat),
         lugar_lng = COALESCE($6, lugar_lng),
         zona = COALESCE($7, zona),
         descripcion = COALESCE($8, descripcion),
         plazo_coordinacion = COALESCE($9, plazo_coordinacion)
       WHERE id = $10
       RETURNING *`,
      [nombre, tipo, fecha, lugar_direccion, lugar_lat, lugar_lng,
       zona, descripcion, plazo_coordinacion, req.params.id]
    );
    res.json({ remate: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id/publicar — publicar y notificar ────────────────────
router.put('/:id/publicar', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede publicar el remate' });
    }
    if (remate.estado !== 'borrador') {
      return res.status(400).json({ error: 'Solo se pueden publicar remates en borrador' });
    }

    const { rows } = await pool.query(
      `UPDATE remates SET estado = 'publicado' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ remate: rows[0] });

    // Notificar transportistas aprobados cuya zona coincide
    if (remate.zona) {
      pool.query(
        `SELECT email, nombre FROM usuarios
         WHERE rol = 'transportista' AND estado = 'aprobado'
           AND zona IS NOT NULL AND $1 ILIKE '%' || zona || '%'`,
        [remate.zona]
      ).then(({ rows: transportistas }) => {
        for (const t of transportistas) {
          emailRematePublicado(t.email, t.nombre, rows[0]).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id/cerrar — cerrar manualmente ────────────────────────
router.put('/:id/cerrar', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede cerrar el remate' });
    }

    const { rows } = await pool.query(
      `UPDATE remates SET estado = 'cerrado' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ remate: rows[0] });

    // Notificar a todos los involucrados
    pool.query(
      `SELECT u.email, u.nombre FROM usuarios u
       JOIN remate_transportistas rt ON rt.transportista_id = u.id
       WHERE rt.remate_id = $1`,
      [req.params.id]
    ).then(({ rows: ts }) => {
      for (const t of ts) {
        emailRemateCerrado(t.email, t.nombre, rows[0]).catch(() => {});
      }
    }).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/remates/:id/lotes — agregar lote ───────────────────────────────
router.post('/:id/lotes', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede agregar lotes' });
    }

    const {
      descripcion, tipo_hacienda, cantidad_cabezas_estimada,
      origen_direccion, origen_lat, origen_lng,
      peso_promedio_kg, peso_total_kg,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO remate_lotes
         (remate_id, descripcion, tipo_hacienda, cantidad_cabezas_estimada,
          origen_direccion, origen_lat, origen_lng,
          peso_promedio_kg, peso_total_kg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [req.params.id, descripcion || null, tipo_hacienda || null,
       cantidad_cabezas_estimada || null,
       origen_direccion || null, origen_lat || null, origen_lng || null,
       peso_promedio_kg || null, peso_total_kg || null]
    );
    res.status(201).json({ lote: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id/lotes/:loteId — editar lote ────────────────────────
router.put('/:id/lotes/:loteId', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede editar lotes' });
    }

    const {
      descripcion, tipo_hacienda, cantidad_cabezas_estimada,
      origen_direccion, origen_lat, origen_lng,
      peso_promedio_kg, peso_total_kg,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE remate_lotes SET
         descripcion = COALESCE($1, descripcion),
         tipo_hacienda = COALESCE($2, tipo_hacienda),
         cantidad_cabezas_estimada = COALESCE($3, cantidad_cabezas_estimada),
         origen_direccion = COALESCE($4, origen_direccion),
         origen_lat = COALESCE($5, origen_lat),
         origen_lng = COALESCE($6, origen_lng),
         peso_promedio_kg = COALESCE($7, peso_promedio_kg),
         peso_total_kg = COALESCE($8, peso_total_kg)
       WHERE id = $9 AND remate_id = $10
       RETURNING *`,
      [descripcion, tipo_hacienda, cantidad_cabezas_estimada,
       origen_direccion, origen_lat, origen_lng,
       peso_promedio_kg || null, peso_total_kg || null,
       req.params.loteId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ lote: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id/lotes/:loteId/vendido — marcar vendido + crear viaje ─
router.put('/:id/lotes/:loteId/vendido', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede marcar lotes como vendidos' });
    }

    const { rows: [lote] } = await pool.query(
      'SELECT * FROM remate_lotes WHERE id = $1 AND remate_id = $2',
      [req.params.loteId, req.params.id]
    );
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.estado === 'vendido') {
      return res.status(400).json({ error: 'El lote ya está marcado como vendido' });
    }

    const {
      comprador_nombre, destino_direccion, destino_lat, destino_lng,
    } = req.body;

    if (!destino_direccion) {
      return res.status(400).json({ error: 'destino_direccion es obligatorio' });
    }

    // Crear viaje automáticamente
    const { rows: [viaje] } = await pool.query(
      `INSERT INTO viajes
         (origen, destino, fecha_salida, tipo_hacienda, cantidad_cabezas,
          origen_direccion, origen_lat, origen_lng,
          destino_direccion, destino_lat, destino_lng,
          usuario_id, remate_lote_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        lote.origen_direccion || remate.lugar_direccion || remate.zona || 'Origen del remate',
        destino_direccion,
        remate.fecha,
        lote.tipo_hacienda || 'Hacienda',
        lote.cantidad_cabezas_estimada || 1,
        lote.origen_direccion || remate.lugar_direccion,
        lote.origen_lat || remate.lugar_lat,
        lote.origen_lng || remate.lugar_lng,
        destino_direccion,
        destino_lat || null,
        destino_lng || null,
        req.user.id,
        lote.id,
      ]
    );

    // Actualizar el lote
    const { rows: [loteActualizado] } = await pool.query(
      `UPDATE remate_lotes SET
         estado = 'vendido',
         comprador_nombre = $1,
         destino_direccion = $2,
         destino_lat = $3,
         destino_lng = $4,
         viaje_id = $5
       WHERE id = $6
       RETURNING *`,
      [comprador_nombre || null, destino_direccion, destino_lat || null,
       destino_lng || null, viaje.id, lote.id]
    );

    // Marcar remate en_curso si estaba publicado
    await pool.query(
      `UPDATE remates SET estado = 'en_curso' WHERE id = $1 AND estado = 'publicado'`,
      [req.params.id]
    );

    // Otros lotes pendientes del mismo remate (para sugerir agrupación)
    const { rows: otrosPendientes } = await pool.query(
      `SELECT * FROM remate_lotes WHERE remate_id = $1 AND id != $2 AND estado = 'pendiente'`,
      [req.params.id, lote.id]
    );

    res.json({ lote: loteActualizado, viaje, otros_lotes_pendientes: otrosPendientes });

    // Notificar a todos los pre-anotados
    pool.query(
      `SELECT u.email, u.nombre FROM usuarios u
       JOIN remate_transportistas rt ON rt.transportista_id = u.id
       WHERE rt.remate_id = $1`,
      [req.params.id]
    ).then(({ rows: ts }) => {
      for (const t of ts) {
        emailRemateLoteVendido(t.email, t.nombre, remate, loteActualizado).catch(() => {});
      }
    }).catch(() => {});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/remates/:id/anotarse — transportista se pre-anota ───────────────
router.post('/:id/anotarse', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas pueden anotarse' });
  }

  const estadoUsr = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [req.user.id]);
  if (estadoUsr.rows[0]?.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
  }

  const { tipo_remolque } = req.body ?? {};

  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (!['publicado', 'en_curso'].includes(remate.estado)) {
      return res.status(400).json({ error: 'No podés anotarte a este remate' });
    }

    const { rows } = await pool.query(
      `INSERT INTO remate_transportistas (remate_id, transportista_id, tipo_remolque)
       VALUES ($1, $2, $3)
       ON CONFLICT (remate_id, transportista_id) DO UPDATE SET tipo_remolque = EXCLUDED.tipo_remolque
       RETURNING *`,
      [req.params.id, req.user.id, tipo_remolque || req.user.tipo_remolque || null]
    );
    res.status(201).json({ inscripcion: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /api/remates/:id/anotarse — transportista se desanota ─────────────
router.delete('/:id/anotarse', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas pueden desanotarse' });
  }
  try {
    await pool.query(
      'DELETE FROM remate_transportistas WHERE remate_id = $1 AND transportista_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/remates/:id/transportistas — lista de pre-anotados ──────────────
router.get('/:id/transportistas', async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query(
      'SELECT lugar_lat, lugar_lng FROM remates WHERE id = $1', [req.params.id]
    );
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });

    const { rows } = await pool.query(
      `SELECT rt.id, rt.tipo_remolque, rt.estado, rt.created_at,
              u.id AS transportista_id, u.nombre, u.zona, u.capacidad_kg,
              u.puntuacion_promedio, u.cantidad_reseñas
       FROM remate_transportistas rt
       JOIN usuarios u ON u.id = rt.transportista_id
       WHERE rt.remate_id = $1
       ORDER BY u.puntuacion_promedio DESC NULLS LAST, rt.created_at ASC`,
      [req.params.id]
    );
    res.json({ transportistas: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/remates/:id/lotes/:loteId/asignar — asignar transportista ──────
router.post('/:id/lotes/:loteId/asignar', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede asignar transportistas' });
    }

    const { rows: [lote] } = await pool.query(
      'SELECT * FROM remate_lotes WHERE id = $1 AND remate_id = $2',
      [req.params.loteId, req.params.id]
    );
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (!lote.viaje_id) return res.status(400).json({ error: 'El lote debe estar vendido para asignar transportista' });

    let { transportista_id } = req.body ?? {};

    if (!transportista_id) {
      // Auto-seleccionar el mejor pre-anotado
      const { rows: candidatos } = await pool.query(
        `SELECT u.id, u.puntuacion_promedio, u.capacidad_kg
         FROM remate_transportistas rt
         JOIN usuarios u ON u.id = rt.transportista_id
         WHERE rt.remate_id = $1
         ORDER BY u.puntuacion_promedio DESC NULLS LAST, u.capacidad_kg DESC NULLS LAST
         LIMIT 1`,
        [req.params.id]
      );
      if (!candidatos[0]) {
        return res.status(400).json({ error: 'No hay transportistas pre-anotados para asignar' });
      }
      transportista_id = candidatos[0].id;
    }

    // Crear o actualizar aplicacion como aceptada
    await pool.query(
      `INSERT INTO aplicaciones (viaje_id, transportista_id, mensaje, estado)
       VALUES ($1, $2, 'Asignado desde remate', 'aceptada')
       ON CONFLICT (viaje_id, transportista_id) DO UPDATE SET estado = 'aceptada'`,
      [lote.viaje_id, transportista_id]
    );

    // Marcar el viaje como completo
    await pool.query(
      `UPDATE viajes SET estado = 'completo' WHERE id = $1`,
      [lote.viaje_id]
    );

    // Actualizar lote con transportista asignado
    const { rows: [loteActualizado] } = await pool.query(
      `UPDATE remate_lotes SET transportista_asignado_id = $1 WHERE id = $2 RETURNING *`,
      [transportista_id, lote.id]
    );

    res.json({ lote: loteActualizado, transportista_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /api/remates/:id/lotes/:loteId/reasignar — cambiar transportista ──────
router.put('/:id/lotes/:loteId/reasignar', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede reasignar transportistas' });
    }

    const { rows: [lote] } = await pool.query(
      'SELECT * FROM remate_lotes WHERE id = $1 AND remate_id = $2',
      [req.params.loteId, req.params.id]
    );
    if (!lote || !lote.viaje_id) {
      return res.status(400).json({ error: 'Lote no encontrado o sin viaje asociado' });
    }

    const { transportista_id } = req.body ?? {};
    if (!transportista_id) {
      return res.status(400).json({ error: 'transportista_id es obligatorio' });
    }

    // Rechazar aplicaciones anteriores
    await pool.query(
      `UPDATE aplicaciones SET estado = 'rechazada' WHERE viaje_id = $1 AND estado = 'aceptada'`,
      [lote.viaje_id]
    );

    // Asignar nuevo
    await pool.query(
      `INSERT INTO aplicaciones (viaje_id, transportista_id, mensaje, estado)
       VALUES ($1, $2, 'Reasignado desde remate', 'aceptada')
       ON CONFLICT (viaje_id, transportista_id) DO UPDATE SET estado = 'aceptada'`,
      [lote.viaje_id, transportista_id]
    );

    const { rows: [loteActualizado] } = await pool.query(
      `UPDATE remate_lotes SET transportista_asignado_id = $1 WHERE id = $2 RETURNING *`,
      [transportista_id, lote.id]
    );

    res.json({ lote: loteActualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/remates/:id/agrupar — agrupa lotes pendientes en un viaje ya creado ──
router.post('/:id/agrupar', authMiddleware, async (req, res) => {
  try {
    const { rows: [remate] } = await pool.query('SELECT * FROM remates WHERE id = $1', [req.params.id]);
    if (!remate) return res.status(404).json({ error: 'Remate no encontrado' });
    if (remate.consignataria_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede agrupar lotes' });
    }

    const { viaje_id, lote_ids, comprador_nombre, destino_direccion, destino_lat, destino_lng } = req.body;
    if (!viaje_id || !Array.isArray(lote_ids) || lote_ids.length === 0) {
      return res.status(400).json({ error: 'viaje_id y lote_ids son obligatorios' });
    }
    if (!destino_direccion) {
      return res.status(400).json({ error: 'destino_direccion es obligatorio' });
    }

    // Verificar que los lotes pertenecen a este remate y están pendientes
    const { rows: lotes } = await pool.query(
      `SELECT * FROM remate_lotes WHERE id = ANY($1::int[]) AND remate_id = $2 AND estado = 'pendiente'`,
      [lote_ids, req.params.id]
    );
    if (lotes.length === 0) {
      return res.status(400).json({ error: 'No se encontraron lotes válidos para agrupar' });
    }

    const lotesActualizados = [];
    for (const lote of lotes) {
      const { rows: [loteAct] } = await pool.query(
        `UPDATE remate_lotes SET
           estado = 'vendido',
           comprador_nombre = $1,
           destino_direccion = $2,
           destino_lat = $3,
           destino_lng = $4,
           viaje_id = $5
         WHERE id = $6
         RETURNING *`,
        [comprador_nombre || null, destino_direccion, destino_lat || null, destino_lng || null, viaje_id, lote.id]
      );
      lotesActualizados.push(loteAct);
    }

    // Sumar cabezas al viaje principal
    const totalCabezas = lotes.reduce((s, l) => s + (l.cantidad_cabezas_estimada || 0), 0);
    if (totalCabezas > 0) {
      await pool.query(
        `UPDATE viajes SET cantidad_cabezas = cantidad_cabezas + $1 WHERE id = $2`,
        [totalCabezas, viaje_id]
      );
    }

    res.json({ lotes: lotesActualizados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── CRON — cada 5 minutos ────────────────────────────────────────────────────

function iniciarRematesCron(pool) {
  const INTERVALO_MS = 5 * 60 * 1000;

  async function correr() {
    try {
      // 1. Cerrar remates cuyo plazo ya pasó
      const { rows: vencidos } = await pool.query(
        `UPDATE remates SET estado = 'cerrado'
         WHERE plazo_coordinacion <= NOW()
           AND estado IN ('publicado','en_curso')
         RETURNING id, nombre, lugar_direccion, fecha, zona`
      );
      for (const remate of vencidos) {
        const { rows: ts } = await pool.query(
          `SELECT u.email, u.nombre FROM usuarios u
           JOIN remate_transportistas rt ON rt.transportista_id = u.id
           WHERE rt.remate_id = $1`,
          [remate.id]
        );
        for (const t of ts) {
          emailRemateCerrado(t.email, t.nombre, remate).catch(() => {});
        }
        if (vencidos.length) console.log(`[remates-cron] Cerrado: remate ${remate.id}`);
      }

      // 2. Alerta 1h antes del plazo (si no se envió ya)
      const { rows: proximos } = await pool.query(
        `SELECT r.id, r.nombre, r.lugar_direccion, r.fecha, r.plazo_coordinacion,
                u.email AS consignataria_email, u.nombre AS consignataria_nombre
         FROM remates r
         JOIN usuarios u ON u.id = r.consignataria_id
         WHERE r.estado IN ('publicado','en_curso')
           AND r.alerta_1h_enviada = false
           AND r.plazo_coordinacion BETWEEN NOW() AND NOW() + INTERVAL '1 hour'`
      );
      for (const r of proximos) {
        await pool.query(
          `UPDATE remates SET alerta_1h_enviada = true WHERE id = $1`,
          [r.id]
        );
        emailRemateAlertaPlazoCercano(
          r.consignataria_email, r.consignataria_nombre, r
        ).catch(() => {});
      }

      // 3. Abrir a toda la zona lotes vendidos sin confirmación tras 30 min
      const { rows: lotesAbiertos } = await pool.query(
        `SELECT l.id AS lote_id, l.remate_id, l.viaje_id, l.tipo_hacienda,
                r.zona AS remate_zona
         FROM remate_lotes l
         JOIN remates r ON r.id = l.remate_id
         JOIN viajes v ON v.id = l.viaje_id
         WHERE l.estado = 'vendido'
           AND l.transportista_asignado_id IS NULL
           AND v.estado = 'disponible'
           AND v.created_at < NOW() - INTERVAL '30 minutes'
           AND r.zona IS NOT NULL`
      );
      for (const lote of lotesAbiertos) {
        // Notificar a transportistas de la zona que no estén ya anotados
        const { rows: nuevos } = await pool.query(
          `SELECT u.email, u.nombre FROM usuarios u
           WHERE u.rol = 'transportista' AND u.estado = 'aprobado'
             AND u.zona IS NOT NULL AND $1 ILIKE '%' || u.zona || '%'
             AND u.id NOT IN (
               SELECT transportista_id FROM remate_transportistas WHERE remate_id = $2
             )`,
          [lote.remate_zona, lote.remate_id]
        );
        const { rows: [remateFull] } = await pool.query(
          'SELECT * FROM remates WHERE id = $1', [lote.remate_id]
        );
        const { rows: [loteFull] } = await pool.query(
          'SELECT * FROM remate_lotes WHERE id = $1', [lote.lote_id]
        );
        for (const t of nuevos) {
          emailRemateLoteAbiertoZona(t.email, t.nombre, remateFull, loteFull).catch(() => {});
        }
      }

    } catch (err) {
      console.error('[remates-cron] Error:', err.message);
    }
  }

  correr();
  setInterval(correr, INTERVALO_MS);
}

module.exports = { router, iniciarRematesCron };
