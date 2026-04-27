const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function sendEmail(to, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return Promise.resolve();
  return transporter.sendMail({
    from: `"ARREO" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  }).catch(err => console.error('[email] Error enviando a', to, '—', err.message));
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

const BULL_SVG = `<svg width="34" height="34" viewBox="22 40 158 120" style="display:inline-block;vertical-align:middle" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,200) scale(0.1,-0.1)" stroke="#BDD18A" stroke-width="20" stroke-linejoin="round" stroke-linecap="round" fill="none"><path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/></g></svg>`;

function layout(content) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARREO</title></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

  <tr><td style="background:#1F2B1F;border-radius:12px 12px 0 0;padding:22px 32px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:12px">${BULL_SVG}</td>
      <td style="vertical-align:middle">
        <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.1em;line-height:1">ARREO</div>
        <div style="font-size:10px;color:#BDD18A;letter-spacing:.15em;text-transform:uppercase;margin-top:3px">Transporte Ganadero Inteligente</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#ffffff;padding:36px 32px">${content}</td></tr>

  <tr><td style="background:#1F2B1F;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
    <div style="font-size:12px;color:#BDD18A;letter-spacing:.05em">ARREO — Transporte Ganadero Inteligente</div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:5px">Mensaje automático. Por favor no respondas este email.</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function btn(href, text) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px auto 0"><tr><td style="border-radius:9px;background:#E07A34"><a href="${href}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:9px;letter-spacing:.03em">${text}</a></td></tr></table>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1F2B1F;line-height:1.3">${text}</h1>`;
}

function p(text, extra) {
  return `<p style="margin:0 0 12px;font-size:14px;color:${extra === 'muted' ? '#888' : '#444'};line-height:1.6">${text}</p>`;
}

function infoBox(rows) {
  const cells = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:8px 14px;font-size:11px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #f0f0ed;white-space:nowrap">${label}</td>
      <td style="padding:8px 14px;font-size:13px;color:#222;font-weight:500;border-bottom:1px solid #f0f0ed">${value}</td>
    </tr>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;border-radius:8px;margin:16px 0;overflow:hidden">${cells}</table>`;
}

function motivoBox(motivo) {
  return `<div style="background:#fff5f5;border:1px solid rgba(200,48,48,.15);border-radius:8px;padding:14px 16px;margin:16px 0">
    <div style="font-size:11px;font-weight:700;color:#C83030;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Motivo</div>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.5">${motivo}</p>
  </div>`;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Email #1: Transportista registrado ──────────────────────────────────────

function emailTransportistaRegistrado(nombre, email) {
  const html = layout(
    h1('¡Tu solicitud fue recibida!') +
    p(`Hola <strong>${nombre}</strong>, gracias por registrarte como transportista en ARREO.`) +
    p('Nuestro equipo revisará tu documentación en las próximas <strong>24 a 48 horas hábiles</strong>.') +
    infoBox([
      ['Próximo paso', 'Revisión de documentación'],
      ['Tiempo estimado', '24 a 48 horas hábiles'],
      ['Notificación', 'Te avisaremos por email cuando tu cuenta esté habilitada'],
    ]) +
    p('Podés revisar el estado de tu solicitud en cualquier momento.', 'muted') +
    btn(`${FRONTEND_URL}/verificacion`, 'Ver estado de mi solicitud')
  );
  return sendEmail(email, 'Bienvenido a ARREO — Tu solicitud fue recibida', html);
}

// ─── Email #2: Transportista aprobado ────────────────────────────────────────

function emailTransportistaAprobado(nombre, email) {
  const html = layout(
    h1('✅ ¡Tu cuenta fue aprobada!') +
    p(`Hola <strong>${nombre}</strong>, excelente noticia.`) +
    p('Tu cuenta de transportista en ARREO fue verificada y aprobada. Ya podés explorar y aplicar a viajes disponibles en tu zona.') +
    btn(`${FRONTEND_URL}/login`, 'Ingresar a ARREO')
  );
  return sendEmail(email, '✅ Tu cuenta fue aprobada — Ya podés usar ARREO', html);
}

// ─── Email #3: Transportista rechazado ───────────────────────────────────────

function emailCuentaRechazada(nombre, email, motivo) {
  const html = layout(
    h1('Tu cuenta requiere correcciones') +
    p(`Hola <strong>${nombre}</strong>, revisamos tu solicitud y lamentablemente no pudimos aprobarla en este momento.`) +
    (motivo ? motivoBox(motivo) : '') +
    p('Podés volver a registrarte con la documentación correcta. Si tenés dudas contactanos por WhatsApp.', 'muted') +
    btn(`${FRONTEND_URL}/register`, 'Volver a enviar documentación')
  );
  return sendEmail(email, 'Tu cuenta requiere correcciones', html);
}

// ─── Email #4: Nuevo viaje en zona (para transportista) ──────────────────────

function emailNuevoViajeEnZona(transportistaEmail, transportistaNombre, viaje) {
  const filas = [
    ['Ruta', `${viaje.origen} → ${viaje.destino}`],
    ['Fecha', fmtFecha(viaje.fecha_salida)],
    ['Hacienda', viaje.tipo_hacienda],
  ];
  if (viaje.cantidad_cabezas) filas.push(['Cabezas', String(viaje.cantidad_cabezas)]);
  if (viaje.peso_total_kg)    filas.push(['Peso total', `${Number(viaje.peso_total_kg).toLocaleString('es-AR')} kg`]);
  if (viaje.categoria)        filas.push(['Categoría', viaje.categoria]);

  const html = layout(
    h1('🚛 Nuevo viaje disponible en tu zona') +
    p(`Hola <strong>${transportistaNombre}</strong>, hay un nuevo viaje que coincide con tu zona de operación.`) +
    infoBox(filas) +
    btn(`${FRONTEND_URL}/viajes/${viaje.id}`, 'Ver viaje y aplicar')
  );
  return sendEmail(transportistaEmail, '🚛 Nuevo viaje disponible en tu zona', html);
}

// ─── Email #5: Aplicación aceptada (para transportista) ──────────────────────

function emailAplicacionAceptada(transportistaEmail, transportistaNombre, viaje, productorNombre, productorZona) {
  const filas = [
    ['Ruta', `${viaje.origen} → ${viaje.destino}`],
    ['Fecha', fmtFecha(viaje.fecha_salida)],
    ['Hacienda', viaje.tipo_hacienda],
    ['Productor', productorNombre],
  ];
  if (viaje.cantidad_cabezas) filas.push(['Cabezas', String(viaje.cantidad_cabezas)]);
  if (productorZona)          filas.push(['Zona productor', productorZona]);

  const html = layout(
    h1('✅ ¡Tu aplicación fue aceptada!') +
    p(`Hola <strong>${transportistaNombre}</strong>, el productor eligió tu propuesta para el siguiente viaje.`) +
    infoBox(filas) +
    p('Pronto el productor se contactará con vos para coordinar los detalles.', 'muted') +
    btn(`${FRONTEND_URL}/mis-viajes`, 'Ver mis aplicaciones')
  );
  return sendEmail(transportistaEmail, '✅ ¡Tu aplicación fue aceptada!', html);
}

// ─── Email #6: Aplicación rechazada (para transportista) ─────────────────────

function emailAplicacionRechazada(transportistaEmail, transportistaNombre, viaje) {
  const html = layout(
    h1('Tu aplicación no fue seleccionada') +
    p(`Hola <strong>${transportistaNombre}</strong>, en esta oportunidad el productor eligió otro transportista.`) +
    infoBox([
      ['Ruta', `${viaje.origen} → ${viaje.destino}`],
      ['Fecha', fmtFecha(viaje.fecha_salida)],
      ['Hacienda', viaje.tipo_hacienda],
    ]) +
    p('No te desanimes — hay muchos viajes disponibles. ¡Seguí aplicando!', 'muted') +
    btn(`${FRONTEND_URL}/viajes`, 'Ver viajes disponibles')
  );
  return sendEmail(transportistaEmail, 'Tu aplicación no fue seleccionada', html);
}

// ─── Email #7: Productor/consignataria registrado ────────────────────────────

function emailProductorRegistrado(nombre, email, cuit) {
  const filas = [['Datos recibidos', nombre]];
  if (cuit) filas.push(['CUIT/CUIL', cuit]);
  filas.push(['Estado', 'En verificación'], ['Tiempo estimado', '24 a 48 horas hábiles']);

  const html = layout(
    h1('¡Bienvenido a ARREO!') +
    p(`Hola <strong>${nombre}</strong>, tu cuenta está siendo verificada por nuestro equipo.`) +
    infoBox(filas) +
    p('Una vez aprobada tu cuenta podrás publicar viajes y contratar transportistas verificados.', 'muted') +
    btn(`${FRONTEND_URL}/verificacion`, 'Ver estado de mi cuenta')
  );
  return sendEmail(email, 'Bienvenido a ARREO — Cuenta en verificación', html);
}

// ─── Email #8: Productor aprobado ────────────────────────────────────────────

function emailProductorAprobado(nombre, email) {
  const html = layout(
    h1('✅ ¡Tu cuenta fue aprobada!') +
    p(`Hola <strong>${nombre}</strong>, tu cuenta fue verificada y aprobada.`) +
    p('Ya podés publicar viajes y conectarte con transportistas verificados en todo el país.') +
    btn(`${FRONTEND_URL}/viajes/nuevo`, 'Publicar mi primer viaje')
  );
  return sendEmail(email, '✅ Tu cuenta fue aprobada — Publicá tu primer viaje', html);
}

// ─── Email #9: Nuevo transportista aplicó (para productor) ───────────────────

function emailNuevaAplicacion(productorEmail, productorNombre, viaje, transportista) {
  const stars = Math.round(Number(transportista.puntuacion_promedio) || 0);
  const starsStr = stars > 0
    ? `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} (${Number(transportista.puntuacion_promedio).toFixed(1)})`
    : 'Sin reseñas';

  const filas = [
    ['Viaje', `${viaje.origen} → ${viaje.destino}`],
    ['Transportista', transportista.nombre],
    ['Puntuación', starsStr],
  ];
  if (transportista.tipo_remolque) filas.push(['Tipo remolque', transportista.tipo_remolque]);
  if (transportista.capacidad_kg)  filas.push(['Capacidad', `${Number(transportista.capacidad_kg).toLocaleString('es-AR')} kg`]);
  if (transportista.cantidad_reseñas > 0) filas.push(['Reseñas', String(transportista.cantidad_reseñas)]);

  const html = layout(
    h1('🚛 Un transportista aplicó a tu viaje') +
    p(`Hola <strong>${productorNombre}</strong>, recibiste una nueva aplicación.`) +
    infoBox(filas) +
    btn(`${FRONTEND_URL}/viajes/${viaje.id}`, 'Ver aplicaciones')
  );
  return sendEmail(productorEmail, '🚛 Un transportista aplicó a tu viaje', html);
}

// ─── Email #10: Recordatorio viaje próximo (para productor) ──────────────────

function emailRecordatorioViaje(productorEmail, productorNombre, viaje, transportistaNombre, patente) {
  const filas = [
    ['Ruta', `${viaje.origen} → ${viaje.destino}`],
    ['Fecha', fmtFecha(viaje.fecha_salida)],
    ['Hacienda', viaje.tipo_hacienda],
    ['Transportista', transportistaNombre],
  ];
  if (viaje.cantidad_cabezas) filas.push(['Cabezas', String(viaje.cantidad_cabezas)]);
  if (patente)                filas.push(['Patente', patente]);

  const html = layout(
    h1('⏰ Tu viaje es mañana') +
    p(`Hola <strong>${productorNombre}</strong>, te recordamos que tenés un viaje programado para mañana.`) +
    infoBox(filas) +
    btn(`${FRONTEND_URL}/mis-viajes`, 'Ver mis viajes')
  );
  return sendEmail(productorEmail, '⏰ Tu viaje es mañana', html);
}

// ─── Email #11: Admin — nuevo transportista pendiente ────────────────────────

function emailAdminNuevoTransportista(adminEmail, nombre, email, patente) {
  const filas = [
    ['Nombre', nombre],
    ['Email', email],
    ['Registrado', new Date().toLocaleString('es-AR')],
  ];
  if (patente) filas.push(['Patente', patente]);

  const html = layout(
    h1('🔔 Nuevo transportista pendiente de aprobación') +
    p('Un nuevo transportista completó su registro y está esperando verificación.') +
    infoBox(filas) +
    btn(`${FRONTEND_URL}/admin`, 'Ver en panel admin')
  );
  return sendEmail(adminEmail, '🔔 Nuevo transportista requiere verificación', html);
}

// ─── Email #12: Admin — nuevo productor/consignataria pendiente ───────────────

function emailAdminNuevoProductor(adminEmail, nombre, email, cuit, rol) {
  const filas = [
    ['Nombre', nombre],
    ['Email', email],
    ['Rol', rol],
    ['Registrado', new Date().toLocaleString('es-AR')],
  ];
  if (cuit) filas.push(['CUIT/CUIL', cuit]);

  const html = layout(
    h1(`🔔 Nuevo ${rol} pendiente de aprobación`) +
    p(`Un nuevo ${rol} completó su registro y está esperando verificación.`) +
    infoBox(filas) +
    btn(`${FRONTEND_URL}/admin`, 'Ver en panel admin')
  );
  return sendEmail(adminEmail, `🔔 Nuevo ${rol} requiere verificación`, html);
}

// ─── Cron: recordatorio 24hs antes del viaje ─────────────────────────────────

function iniciarReminderViajes(pool) {
  const INTERVALO_MS = 24 * 60 * 60 * 1000;

  async function correr() {
    try {
      const { rows } = await pool.query(`
        SELECT v.id, v.origen, v.destino, v.fecha_salida, v.tipo_hacienda, v.cantidad_cabezas,
               u.email  AS productor_email,  u.nombre  AS productor_nombre,
               t.nombre AS transportista_nombre, t.patente
        FROM viajes v
        JOIN usuarios u ON u.id = v.usuario_id
        JOIN aplicaciones a ON a.viaje_id = v.id AND a.estado = 'aceptada'
        JOIN usuarios t ON t.id = a.transportista_id
        WHERE v.fecha_salida::date = CURRENT_DATE + INTERVAL '1 day'
          AND v.estado = 'completo'
      `);
      for (const r of rows) {
        emailRecordatorioViaje(r.productor_email, r.productor_nombre, r, r.transportista_nombre, r.patente);
      }
      if (rows.length) console.log(`[email-cron] ${rows.length} recordatorio(s) enviado(s)`);
    } catch (err) {
      console.error('[email-cron] Error:', err.message);
    }
  }

  correr();
  setInterval(correr, INTERVALO_MS);
}

module.exports = {
  sendEmail,
  emailTransportistaRegistrado,
  emailTransportistaAprobado,
  emailCuentaRechazada,
  emailNuevoViajeEnZona,
  emailAplicacionAceptada,
  emailAplicacionRechazada,
  emailProductorRegistrado,
  emailProductorAprobado,
  emailNuevaAplicacion,
  emailRecordatorioViaje,
  emailAdminNuevoTransportista,
  emailAdminNuevoProductor,
  iniciarReminderViajes,
};
