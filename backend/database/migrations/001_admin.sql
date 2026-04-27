-- ============================================================
-- Migración 001: Panel superadmin
-- Ejecutar con: psql $DATABASE_URL -f database/migrations/001_admin.sql
-- ============================================================

-- 1. Agregar rol superadmin al enum
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Agregar columnas de estado, aprobación e identidad fiscal a usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado          VARCHAR(20)  DEFAULT 'aprobado',
  ADD COLUMN IF NOT EXISTS aprobado_en     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS aprobado_por    INTEGER,
  ADD COLUMN IF NOT EXISTS cuit_cuil       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cuit_verificado BOOLEAN      DEFAULT false;

-- Los usuarios existentes quedan como 'aprobado' (ya estaban usando el sistema)
-- Los nuevos registros quedarán en 'pendiente' (manejado en el código)

-- 3. Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol    ON usuarios(rol);
