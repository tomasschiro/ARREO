const { Router } = require('express');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../database/connect');
const authMiddleware = require('../middleware/auth');

module.exports = function createTrackingRouter(io) {
  const router = Router();

  // POST /:id/ubicacion — transportista asignado envía su posición GPS
  router.post('/:id/ubicacion', authMiddleware, async (req, res) => {
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat y lng son obligatorios y deben ser números' });
    }
    try {
      const { rows } = await pool.query(
        `SELECT a.transportista_id FROM aplicaciones a
         WHERE a.viaje_id = $1 AND a.estado = 'aceptada' LIMIT 1`,
        [req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Viaje sin transportista asignado' });
      if (rows[0].transportista_id !== req.user.id) {
        return res.status(403).json({ error: 'Solo el transportista asignado puede actualizar la ubicación' });
      }

      await pool.query(
        `UPDATE viajes
         SET ubicacion_lat = $1, ubicacion_lng = $2, ubicacion_actualizada_en = NOW()
         WHERE id = $3`,
        [lat, lng, req.params.id]
      );

      const payload = {
        viajeId: parseInt(req.params.id),
        lat,
        lng,
        timestamp: new Date().toISOString(),
      };
      io.to(`viaje_${req.params.id}`).emit('ubicacion_actualizada', payload);

      res.json({ ok: true });
    } catch (err) {
      console.error('[tracking] POST ubicacion:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  // GET /:id/ubicacion — última posición conocida
  // Permitido: dueño del viaje, transportista asignado, o quien tenga el token de seguimiento
  router.get('/:id/ubicacion', async (req, res) => {
    try {
      const { rows: [v] } = await pool.query(
        `SELECT id, usuario_id, ubicacion_lat, ubicacion_lng, ubicacion_actualizada_en, link_seguimiento
         FROM viajes WHERE id = $1`,
        [req.params.id]
      );
      if (!v) return res.status(404).json({ error: 'Viaje no encontrado' });

      let allowed = false;

      // Acceso por token de seguimiento público
      const { token } = req.query;
      if (token && v.link_seguimiento && v.link_seguimiento === token) {
        allowed = true;
      }

      // Acceso autenticado: dueño o transportista asignado
      if (!allowed) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
            if (decoded.id === v.usuario_id) {
              allowed = true;
            } else {
              const { rows: [a] } = await pool.query(
                `SELECT id FROM aplicaciones
                 WHERE viaje_id = $1 AND transportista_id = $2 AND estado = 'aceptada'`,
                [req.params.id, decoded.id]
              );
              if (a) allowed = true;
            }
          } catch { /* JWT inválido */ }
        }
      }

      if (!allowed) return res.status(403).json({ error: 'Acceso no autorizado' });

      res.json({
        lat: v.ubicacion_lat ?? null,
        lng: v.ubicacion_lng ?? null,
        actualizada_en: v.ubicacion_actualizada_en ?? null,
      });
    } catch (err) {
      console.error('[tracking] GET ubicacion:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  // POST /:id/generar-link — productor genera un link de seguimiento público
  router.post('/:id/generar-link', authMiddleware, async (req, res) => {
    try {
      const { rows: [v] } = await pool.query(
        `SELECT id, usuario_id FROM viajes WHERE id = $1`,
        [req.params.id]
      );
      if (!v) return res.status(404).json({ error: 'Viaje no encontrado' });
      if (v.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'Solo el dueño del viaje puede generar el link de seguimiento' });
      }

      const token = randomUUID();
      await pool.query(`UPDATE viajes SET link_seguimiento = $1 WHERE id = $2`, [token, req.params.id]);

      const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      res.json({ token, url: `${baseUrl}/seguimiento/${token}` });
    } catch (err) {
      console.error('[tracking] POST generar-link:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
