-- Limpia todos los datos de usuarios (excepto superadmin) y contenido relacionado.
-- Útil para resetear el entorno de desarrollo.
-- Ejecutar: psql $DATABASE_URL -f database/reset-users.sql

DELETE FROM reseñas;
DELETE FROM mensajes;
DELETE FROM aplicaciones;
DELETE FROM disponibilidades;
DELETE FROM viajes;
DELETE FROM usuarios WHERE rol != 'superadmin';
