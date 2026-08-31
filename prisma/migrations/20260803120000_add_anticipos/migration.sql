-- CreateEnum
CREATE TYPE "AnticipoEstadoDb" AS ENUM ('LANZADO', 'APROBADO', 'PAGADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AnticipoTipoDb" AS ENUM ('GASTO', 'VIAJE');

-- CreateTable
CREATE TABLE "Anticipo" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Anticipo_codigo_key" ON "Anticipo"("codigo");

-- CreateIndex
CREATE INDEX "Anticipo_empleadoId_estado_idx" ON "Anticipo"("empleadoId", "estado");

-- CreateIndex
CREATE INDEX "Anticipo_estado_idx" ON "Anticipo"("estado");

-- CreateIndex
CREATE INDEX "Anticipo_solicitanteId_idx" ON "Anticipo"("solicitanteId");

-- AddForeignKey
ALTER TABLE "Anticipo" ADD CONSTRAINT "Anticipo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
