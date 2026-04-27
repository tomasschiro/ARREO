-- =============================================================
-- ARREO — Schema completo para Neon (ejecutar desde cero)
-- Combina: schema.sql + migrations/001_admin.sql + runtime migrations
-- Generado: 2026-04-27
-- =============================================================

-- -------------------------------------------------------------
-- 1. TIPOS ENUM
--    Usamos bloques DO para que sea idempotente (re-ejecutable)
-- -------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM (
    'transportista',
    'productor',
    'consignataria',
    'superadmin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_viaje AS ENUM (
    'disponible',
    'con_ofertas',
    'completo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_aplicacion AS ENUM (
    'pendiente',
    'aceptada',
    'rechazada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------
-- 2. TABLA: usuarios
--    Incluye columnas base + las de migration 001_admin
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
  id                  SERIAL          PRIMARY KEY,
  nombre              VARCHAR(100)    NOT NULL,
  email               VARCHAR(255)    NOT NULL UNIQUE,
  password_hash       TEXT            NOT NULL,
  rol                 rol_usuario     NOT NULL,
  zona                VARCHAR(100),
  telefono            VARCHAR(30),

  -- Datos del camión (solo transportistas)
  patente             VARCHAR(20),
  marca_camion        VARCHAR(80),
  modelo_camion       VARCHAR(80),
  año_camion          INTEGER,
  tipo_remolque       VARCHAR(50),
  capacidad_kg        INTEGER,
  foto_camion_url     TEXT,

  -- Estadísticas de reseñas (desnormalizadas)
  puntuacion_promedio NUMERIC(3,2)    DEFAULT 0,
  cantidad_reseñas    INTEGER         DEFAULT 0,

  -- Moderación / aprobación (migration 001)
  estado              VARCHAR(20)     DEFAULT 'pendiente',
  aprobado_en         TIMESTAMP,
  aprobado_por        INTEGER,
  cuit_cuil           VARCHAR(20),
  cuit_verificado     BOOLEAN         DEFAULT false,

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. TABLA: viajes
--    Sin columna categoria (eliminada), con condicion_camino
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS viajes (
  id                SERIAL          PRIMARY KEY,
  origen            VARCHAR(150)    NOT NULL,
  destino           VARCHAR(150)    NOT NULL,
  origen_lat        DOUBLE PRECISION,
  origen_lng        DOUBLE PRECISION,
  origen_direccion  TEXT,
  destino_lat       DOUBLE PRECISION,
  destino_lng       DOUBLE PRECISION,
  destino_direccion TEXT,
  fecha_salida      TIMESTAMPTZ     NOT NULL,
  tipo_hacienda     VARCHAR(80)     NOT NULL,
  cantidad_cabezas  INTEGER         NOT NULL CHECK (cantidad_cabezas > 0),
  peso_promedio_kg  NUMERIC,
  peso_total_kg     NUMERIC,
  tipo_jaula        VARCHAR(50),
  condicion_camino  VARCHAR(50),
  observaciones     TEXT,
  estado            estado_viaje    NOT NULL DEFAULT 'disponible',
  usuario_id        INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 4. TABLA: aplicaciones
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aplicaciones (
  id                SERIAL            PRIMARY KEY,
  viaje_id          INTEGER           NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  transportista_id  INTEGER           NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado            estado_aplicacion NOT NULL DEFAULT 'pendiente',
  mensaje           TEXT,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (viaje_id, transportista_id)
);

-- -------------------------------------------------------------
-- 5. TABLA: disponibilidades
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS disponibilidades (
  id                SERIAL          PRIMARY KEY,
  transportista_id  INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  origen_lat        DOUBLE PRECISION NOT NULL,
  origen_lng        DOUBLE PRECISION NOT NULL,
  origen_direccion  TEXT            NOT NULL,
  destino_lat       DOUBLE PRECISION NOT NULL,
  destino_lng       DOUBLE PRECISION NOT NULL,
  destino_direccion TEXT            NOT NULL,
  fecha             TIMESTAMPTZ     NOT NULL,
  tipo_jaula        VARCHAR(50)     NOT NULL,
  estado            VARCHAR(30)     NOT NULL DEFAULT 'disponible',
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. TABLA: mensajes
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mensajes (
  id                SERIAL          PRIMARY KEY,
  remitente_id      INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  destinatario_id   INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  disponibilidad_id INTEGER         REFERENCES disponibilidades(id) ON DELETE SET NULL,
  asunto            VARCHAR(255)    NOT NULL,
  contenido         TEXT            NOT NULL,
  leido             BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. TABLA: reseñas
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reseñas (
  id                SERIAL          PRIMARY KEY,
  transportista_id  INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  productor_id      INTEGER         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  puntuacion        INTEGER         NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario        TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (transportista_id, productor_id)
);

-- -------------------------------------------------------------
-- 8. ÍNDICES
-- -------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_viajes_usuario          ON viajes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado           ON viajes(estado);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_viaje      ON aplicaciones(viaje_id);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trans      ON aplicaciones(transportista_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidades_trans  ON disponibilidades(transportista_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario   ON mensajes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_reseñas_transportista   ON reseñas(transportista_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado         ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol            ON usuarios(rol);
