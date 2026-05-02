const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');
const {
  emailTransportistaRegistrado,
  emailProductorRegistrado,
  emailAdminNuevoTransportista,
  emailAdminNuevoProductor,
} = require('../services/email.service');

const router = Router();

const CAMPOS_USUARIO = `id, nombre, email, rol, estado, zona, telefono, cuit_cuil,
  patente, marca_camion, modelo_camion, año_camion,
  tipo_remolque, capacidad_kg, foto_camion_url,
  puntuacion_promedio, cantidad_reseñas, created_at, motivo_rechazo`;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const {
    nombre, email, password, rol, zona, telefono, cuit_cuil,
    patente, marca_camion, modelo_camion, año_camion, tipo_remolque, capacidad_kg,
    foto_dni_frente, foto_dni_dorso, foto_licencia, foto_camion,
    foto_linti, foto_seguro, foto_senasa, foto_vtv,
    declaracion_jurada,
    renspa,
  } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });
  }

  const rolesValidos = ['transportista', 'productor', 'consignataria'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: `rol debe ser uno de: ${rolesValidos.join(', ')}` });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const isTransportista = rol === 'transportista';

  if (isTransportista && !declaracion_jurada) {
    return res.status(400).json({ error: 'Debés aceptar la declaración jurada para completar el registro' });
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (
         nombre, email, password_hash, rol, estado, zona, telefono, cuit_cuil,
         patente, marca_camion, modelo_camion, año_camion, tipo_remolque, capacidad_kg,
         foto_dni_frente, foto_dni_dorso, foto_licencia, foto_camion,
         foto_linti, foto_seguro, foto_senasa, foto_vtv,
         declaracion_jurada, declaracion_jurada_fecha,
         renspa
       )
       VALUES ($1,$2,$3,$4,'pendiente',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING ${CAMPOS_USUARIO}`,
      [
        nombre, email, password_hash, rol,
        zona || null, telefono || null, cuit_cuil || null,
        isTransportista ? (patente || null) : null,
        isTransportista ? (marca_camion || null) : null,
        isTransportista ? (modelo_camion || null) : null,
        isTransportista ? (año_camion || null) : null,
        isTransportista ? (tipo_remolque || null) : null,
        isTransportista ? (capacidad_kg || null) : null,
        isTransportista ? (foto_dni_frente || null) : null,
        isTransportista ? (foto_dni_dorso || null) : null,
        isTransportista ? (foto_licencia || null) : null,
        isTransportista ? (foto_camion || null) : null,
        isTransportista ? (foto_linti || null) : null,
        isTransportista ? (foto_seguro || null) : null,
        isTransportista ? (foto_senasa || null) : null,
        isTransportista ? (foto_vtv || null) : null,
        isTransportista ? (declaracion_jurada === true) : false,
        isTransportista && declaracion_jurada ? new Date() : null,
        (!isTransportista) ? (renspa || null) : null,
      ]
    );

    const usuario = rows[0];
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ usuario, token });

    // Emails no bloquean la respuesta
    if (isTransportista) {
      emailTransportistaRegistrado(usuario.nombre, usuario.email).catch(() => {});
    } else {
      emailProductorRegistrado(usuario.nombre, usuario.email, usuario.cuit_cuil).catch(() => {});
    }

    // Notificar al superadmin
    pool.query("SELECT email FROM usuarios WHERE rol = 'superadmin' LIMIT 1")
      .then(({ rows: admins }) => {
        if (!admins[0]) return;
        const adminEmail = admins[0].email;
        if (isTransportista) {
          emailAdminNuevoTransportista(adminEmail, usuario.nombre, usuario.email, usuario.patente).catch(() => {});
        } else {
          emailAdminNuevoProductor(adminEmail, usuario.nombre, usuario.email, usuario.cuit_cuil, usuario.rol).catch(() => {});
        }
      })
      .catch(() => {});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = rows[0];

    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, foto_dni_frente, foto_dni_dorso, foto_licencia, foto_camion, ...datosPublicos } = usuario;
    res.json({ usuario: datosPublicos, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/estado — estado actual del usuario logueado
router.get('/estado', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT estado, motivo_rechazo FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/perfil
router.put('/perfil', authMiddleware, async (req, res) => {
  const {
    nombre, zona, telefono, rol,
    patente, marca_camion, modelo_camion, año_camion, tipo_remolque, capacidad_kg,
  } = req.body ?? {};

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const rolesValidos = ['transportista', 'productor', 'consignataria'];
  if (rol && !rolesValidos.includes(rol)) {
    return res.status(400).json({ error: `rol debe ser uno de: ${rolesValidos.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET
         nombre        = $1,
         zona          = $2,
         telefono      = $3,
         rol           = COALESCE($4, rol),
         patente       = COALESCE($5, patente),
         marca_camion  = COALESCE($6, marca_camion),
         modelo_camion = COALESCE($7, modelo_camion),
         año_camion    = COALESCE($8, año_camion),
         tipo_remolque = COALESCE($9, tipo_remolque),
         capacidad_kg  = COALESCE($10, capacidad_kg)
       WHERE id = $11
       RETURNING ${CAMPOS_USUARIO}`,
      [
        nombre, zona || null, telefono || null, rol || null,
        patente || null, marca_camion || null, modelo_camion || null,
        año_camion || null, tipo_remolque || null, capacidad_kg || null,
        req.user.id,
      ]
    );
    res.json({ usuario: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
