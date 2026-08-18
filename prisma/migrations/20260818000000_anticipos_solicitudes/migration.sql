-- Tabla Anticipo y enums ya existen en Neon (20260803120000 / 20260805130000).
-- Esta migración es idempotente para ambientes nuevos y no rompe el existente.

DO $$ BEGIN
  CREATE TYPE "AnticipoEstadoDb" AS ENUM ('BORRADOR', 'LANZADO', 'APROBADO', 'PAGADO', 'RECHAZADO', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnticipoTipoDb" AS ENUM ('GASTO', 'VIAJE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Anticipo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "solicitanteNombre" TEXT NOT NULL,
    "beneficiarioNombre" TEXT NOT NULL,
    "beneficiarioCedula" TEXT,
    "paraOtro" BOOLEAN NOT NULL DEFAULT false,
    "proyectoId" TEXT NOT NULL,
    "proyectoNombre" TEXT NOT NULL,
    "tipo" "AnticipoTipoDb" NOT NULL,
    "estado" "AnticipoEstadoDb" NOT NULL DEFAULT 'LANZADO',
    "monto" DOUBLE PRECISION NOT NULL,
    "divisa" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "compania" TEXT NOT NULL,
    "empCompania" TEXT NOT NULL,
    "aprobador" TEXT,
    "fechaSolicitud" TEXT NOT NULL,
    "fechaAprob" TEXT,
    "pago" TEXT NOT NULL DEFAULT 'Pendiente',
    "comentarioAprobacion" TEXT NOT NULL DEFAULT '',
    "aprobadorNombre" TEXT,
    "fechaIda" TEXT,
    "fechaRegreso" TEXT,
    "destino" TEXT,
    "tipoViaje" TEXT,
    "cuenta" TEXT,
    "banco" TEXT,
    "tipoCuenta" TEXT,
    "timelineJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anticipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Anticipo_codigo_key" ON "Anticipo"("codigo");
CREATE INDEX IF NOT EXISTS "Anticipo_empleadoId_estado_idx" ON "Anticipo"("empleadoId", "estado");
CREATE INDEX IF NOT EXISTS "Anticipo_estado_idx" ON "Anticipo"("estado");
CREATE INDEX IF NOT EXISTS "Anticipo_solicitanteId_idx" ON "Anticipo"("solicitanteId");
