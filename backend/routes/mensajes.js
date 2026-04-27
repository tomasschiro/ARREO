const { Router } = require('express');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = Router();

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });
}

// POST /api/mensajes — enviar mensaje + email al destinatario
router.post('/', authMiddleware, async (req, res) => {
  const { destinatario_id, disponibilidad_id, asunto, contenido } = req.body ?? {};

  if (!destinatario_id || !asunto || !contenido) {
    return res.status(400).json({ error: 'destinatario_id, asunto y contenido son obligatorios' });
  }

  try {
    const dest = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [destinatario_id]
    );
    if (!dest.rows[0]) return res.status(404).json({ error: 'Destinatario no encontrado' });

    const remitente = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    const { rows } = await pool.query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, disponibilidad_id, asunto, contenido)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, destinatario_id, disponibilidad_id || null, asunto, contenido]
    );

    // Enviar email si hay credenciales configuradas
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"ARREO" <${process.env.GMAIL_USER}>`,
          to: dest.rows[0].email,
          subject: `[ARREO] ${asunto}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#1D9E75;">🐄 ARREO — Nuevo mensaje</h2>
              <p><strong>${remitente.rows[0].nombre}</strong> te envió un mensaje:</p>
              <blockquote style="border-left:4px solid #1D9E75;padding:12px 16px;background:#f9f9f9;border-radius:4px;">
                ${contenido.replace(/\n/g, '<br>')}
              </blockquote>
              <p style="color:#666;font-size:13px;">
                Para responder, ingresá a ARREO y respondé desde la sección Mensajes.<br>
                Contacto del interesado: <strong>${remitente.rows[0].email}</strong>
              </p>
            </div>`,
        });
      } catch (mailErr) {
        console.error('Email no enviado:', mailErr.message);
      }
    }

    res.status(201).json({ mensaje: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/mensajes/recibidos
router.get('/recibidos', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.nombre AS remitente_nombre, u.email AS remitente_email
       FROM mensajes m
       JOIN usuarios u ON u.id = m.remitente_id
       WHERE m.destinatario_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json({ mensajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/mensajes/enviados
router.get('/enviados', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.nombre AS destinatario_nombre
       FROM mensajes m
       JOIN usuarios u ON u.id = m.destinatario_id
       WHERE m.remitente_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json({ mensajes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/mensajes/:id/leer
router.put('/:id/leer', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE mensajes SET leido = TRUE
       WHERE id = $1 AND destinatario_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json({ mensaje: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/mensajes/no-leidos — contador para el sidebar
router.get('/no-leidos', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM mensajes WHERE destinatario_id = $1 AND leido = FALSE`,
      [req.user.id]
    );
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
