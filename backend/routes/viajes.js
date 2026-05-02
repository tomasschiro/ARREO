const { Router } = require('express');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');
const {
  emailNuevoViajeEnZona,
  emailNuevaAplicacion,
  emailAplicacionAceptada,
  emailAplicacionRechazada,
} = require('../services/email.service');

const router = Router();

// GET /api/viajes — lista viajes con filtros opcionales
router.get('/', async (req, res) => {
  const { origen, destino, fecha, tipo_jaula, zona } = req.query;

  const condiciones = ["v.estado != 'completo'"];
  const valores = [];

  if (origen) {
    valores.push(`%${origen}%`);
    condiciones.push(`v.origen ILIKE $${valores.length}`);
  }
  if (destino) {
    valores.push(`%${destino}%`);
    condiciones.push(`v.destino ILIKE $${valores.length}`);
  }
  if (fecha) {
    valores.push(fecha);
    condiciones.push(`v.fecha_salida::date = $${valores.length}`);
  }
  if (tipo_jaula) {
    valores.push(tipo_jaula);
    condiciones.push(`v.tipo_jaula = $${valores.length}`);
  }
  if (zona) {
    valores.push(`%${zona}%`);
    condiciones.push(`u.zona ILIKE $${valores.length}`);
  }

  const where = `WHERE ${condiciones.join(' AND ')}`;

  try {
    const { rows } = await pool.query(
      `SELECT v.*, u.nombre AS publicado_por, u.zona AS zona_publicante
       FROM viajes v
       JOIN usuarios u ON u.id = v.usuario_id
       ${where}
       ORDER BY v.fecha_salida ASC`,
      valores
    );
    res.json({ viajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/viajes — crear viaje
router.post('/', authMiddleware, async (req, res) => {
  if (!['productor', 'consignataria'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Solo productores o consignatarias pueden publicar viajes' });
  }

  const estadoUsuario = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [req.user.id]);
  if (estadoUsuario.rows[0]?.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
  }

  const {
    origen, destino, fecha_salida, tipo_hacienda, cantidad_cabezas, observaciones,
    origen_lat, origen_lng, origen_direccion,
    destino_lat, destino_lng, destino_direccion,
    peso_promedio_kg, peso_total_kg, tipo_jaula, condicion_camino,
  } = req.body;

  if (!origen || !destino || !fecha_salida || !tipo_hacienda || !cantidad_cabezas) {
    return res.status(400).json({ error: 'origen, destino, fecha_salida, tipo_hacienda y cantidad_cabezas son obligatorios' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO viajes (
         origen, destino, fecha_salida, tipo_hacienda, cantidad_cabezas, observaciones, usuario_id,
         origen_lat, origen_lng, origen_direccion,
         destino_lat, destino_lng, destino_direccion,
         peso_promedio_kg, peso_total_kg, tipo_jaula, condicion_camino
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        origen, destino, fecha_salida, tipo_hacienda, cantidad_cabezas,
        observaciones || null, req.user.id,
        origen_lat || null, origen_lng || null, origen_direccion || null,
        destino_lat || null, destino_lng || null, destino_direccion || null,
        peso_promedio_kg || null, peso_total_kg || null, tipo_jaula || null, condicion_camino || null,
      ]
    );
    const viaje = rows[0];
    res.status(201).json({ viaje });

    // Notificar transportistas aprobados cuya zona coincide con origen del viaje
    pool.query(
      `SELECT email, nombre FROM usuarios
       WHERE rol = 'transportista' AND estado = 'aprobado'
         AND zona IS NOT NULL AND $1 ILIKE '%' || zona || '%'`,
      [origen]
    ).then(({ rows: transportistas }) => {
      for (const t of transportistas) {
        emailNuevoViajeEnZona(t.email, t.nombre, viaje).catch(() => {});
      }
    }).catch(() => {});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/viajes/publicos — sin auth, campos seguros (sin datos personales del productor)
router.get('/publicos', async (req, res) => {
  const { origen, destino } = req.query;

  const condiciones = ["v.estado != 'completo'"];
  const valores = [];

  if (origen) {
    valores.push(`%${origen}%`);
    condiciones.push(`v.origen ILIKE $${valores.length}`);
  }
  if (destino) {
    valores.push(`%${destino}%`);
    condiciones.push(`v.destino ILIKE $${valores.length}`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.origen, v.destino, v.fecha_salida, v.tipo_hacienda,
              v.cantidad_cabezas, v.peso_total_kg, v.tipo_jaula,
              v.condicion_camino, v.estado, u.zona AS zona_publicante
       FROM viajes v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY v.fecha_salida ASC`,
      valores
    );
    res.json({ viajes: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/viajes/:id — detalle + aplicaciones con datos del camión
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, u.nombre AS publicado_por, u.zona AS zona_publicante
       FROM viajes v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });

    const { rows: aplicaciones } = await pool.query(
      `SELECT a.id, a.estado, a.mensaje, a.created_at,
              u.id AS transportista_id, u.nombre AS transportista_nombre,
              u.tipo_remolque, u.capacidad_kg,
              u.puntuacion_promedio, u.cantidad_reseñas,
              u.estado AS transportista_estado
       FROM aplicaciones a
       JOIN usuarios u ON u.id = a.transportista_id
       WHERE a.viaje_id = $1
       ORDER BY a.created_at ASC`,
      [req.params.id]
    );

    res.json({ viaje: rows[0], aplicaciones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/viajes/:id/aplicaciones/:aid — aceptar o rechazar
router.put('/:id/aplicaciones/:aid', authMiddleware, async (req, res) => {
  const { estado } = req.body ?? {};
  if (!['aceptada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'estado debe ser "aceptada" o "rechazada"' });
  }

  try {
    const viaje = await pool.query('SELECT * FROM viajes WHERE id = $1', [req.params.id]);
    if (!viaje.rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viaje.rows[0].usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño del viaje puede gestionar aplicaciones' });
    }

    const { rows } = await pool.query(
      `UPDATE aplicaciones SET estado = $1 WHERE id = $2 AND viaje_id = $3 RETURNING *`,
      [estado, req.params.aid, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Aplicación no encontrada' });

    if (estado === 'aceptada') {
      await pool.query(`UPDATE viajes SET estado = 'completo' WHERE id = $1`, [req.params.id]);
    }

    res.json({ aplicacion: rows[0] });

    // Notificar al transportista
    pool.query(
      `SELECT u.email, u.nombre FROM usuarios u
       JOIN aplicaciones a ON a.transportista_id = u.id
       WHERE a.id = $1`,
      [rows[0].id]
    ).then(({ rows: [t] }) => {
      if (!t) return;
      if (estado === 'aceptada') {
        // Incluir datos del productor (sin teléfono)
        pool.query(
          `SELECT u.nombre, u.zona FROM usuarios u WHERE u.id = $1`,
          [viaje.rows[0].usuario_id]
        ).then(({ rows: [prod] }) => {
          emailAplicacionAceptada(t.email, t.nombre, viaje.rows[0], prod?.nombre || '', prod?.zona || null).catch(() => {});
        }).catch(() => {});
      } else {
        emailAplicacionRechazada(t.email, t.nombre, viaje.rows[0]).catch(() => {});
      }
    }).catch(() => {});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/viajes/:id/aplicar — transportista aplica
router.post('/:id/aplicar', authMiddleware, async (req, res) => {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas pueden aplicar a viajes' });
  }

  const estadoUsuario = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [req.user.id]);
  if (estadoUsuario.rows[0]?.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
  }

  const viaje_id = parseInt(req.params.id);
  const { mensaje } = req.body ?? {};

  try {
    const viaje = await pool.query('SELECT * FROM viajes WHERE id = $1', [viaje_id]);
    if (!viaje.rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viaje.rows[0].estado === 'completo') {
      return res.status(409).json({ error: 'Este viaje ya está completo' });
    }

    const { rows } = await pool.query(
      `INSERT INTO aplicaciones (viaje_id, transportista_id, mensaje)
       VALUES ($1, $2, $3) RETURNING *`,
      [viaje_id, req.user.id, mensaje || null]
    );

    await pool.query(
      `UPDATE viajes SET estado = 'con_ofertas' WHERE id = $1 AND estado = 'disponible'`,
      [viaje_id]
    );

    res.status(201).json({ aplicacion: rows[0] });

    // Notificar al productor dueño del viaje
    pool.query(
      `SELECT u.email, u.nombre FROM usuarios u WHERE u.id = $1`,
      [viaje.rows[0].usuario_id]
    ).then(({ rows: [prod] }) => {
      if (!prod) return;
      pool.query(
        `SELECT nombre, tipo_remolque, capacidad_kg, puntuacion_promedio, cantidad_reseñas
         FROM usuarios WHERE id = $1`,
        [req.user.id]
      ).then(({ rows: [t] }) => {
        if (!t) return;
        emailNuevaAplicacion(prod.email, prod.nombre, viaje.rows[0], t).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya aplicaste a este viaje' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/viajes/:id/documentacion — cargar DTE y guía provincial
router.put('/:id/documentacion', authMiddleware, async (req, res) => {
  const { dte_numero, guia_provincial_numero } = req.body ?? {};
  if (!dte_numero || !guia_provincial_numero) {
    return res.status(400).json({ error: 'dte_numero y guia_provincial_numero son obligatorios' });
  }
  try {
    const viaje = await pool.query('SELECT * FROM viajes WHERE id = $1', [req.params.id]);
    if (!viaje.rows[0]) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (viaje.rows[0].usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño del viaje puede cargar la documentación' });
    }
    const { rows } = await pool.query(
      `UPDATE viajes SET dte_numero = $1, guia_provincial_numero = $2, documentacion_cargada = true
       WHERE id = $3 RETURNING id, dte_numero, guia_provincial_numero, documentacion_cargada`,
      [dte_numero.trim(), guia_provincial_numero.trim(), req.params.id]
    );
    res.json({ viaje: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/mis-viajes
async function misViajes(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
         (SELECT COUNT(*) FROM aplicaciones a WHERE a.viaje_id = v.id)::int AS total_aplicaciones
       FROM viajes v
       WHERE v.usuario_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    res.json({ viajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /api/mis-aplicaciones
async function misAplicaciones(req, res) {
  if (req.user.rol !== 'transportista') {
    return res.status(403).json({ error: 'Solo los transportistas tienen aplicaciones' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT a.*, v.origen, v.destino, v.fecha_salida, v.tipo_hacienda,
              v.cantidad_cabezas, v.estado AS estado_viaje,
              v.tipo_jaula, v.peso_total_kg, v.condicion_camino,
              v.dte_numero, v.guia_provincial_numero, v.documentacion_cargada,
              u.nombre AS publicado_por
       FROM aplicaciones a
       JOIN viajes v ON v.id = a.viaje_id
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE a.transportista_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ aplicaciones: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { router, misViajes, misAplicaciones };
