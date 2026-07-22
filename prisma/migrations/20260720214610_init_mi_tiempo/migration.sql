-- CreateEnum
CREATE TYPE "RegistroEstadoDb" AS ENUM ('REGISTRADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroTiempo" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "codigo" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "subproyecto" TEXT,
    "actividad" TEXT NOT NULL,
    "tipoHora" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "comentarioRechazo" TEXT NOT NULL DEFAULT '',
    "aprobador" TEXT,
    "estado" "RegistroEstadoDb" NOT NULL DEFAULT 'REGISTRADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroTiempo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroTiempo_legacyId_key" ON "RegistroTiempo"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroTiempo_codigo_key" ON "RegistroTiempo"("codigo");

-- CreateIndex
CREATE INDEX "RegistroTiempo_empleadoId_fecha_idx" ON "RegistroTiempo"("empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroTiempo_estado_idx" ON "RegistroTiempo"("estado");

-- AddForeignKey
ALTER TABLE "RegistroTiempo" ADD CONSTRAINT "RegistroTiempo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTiempo" ADD CONSTRAINT "RegistroTiempo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
