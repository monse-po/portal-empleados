-- CreateEnum
CREATE TYPE "NotificacionModuloDb" AS ENUM ('TIEMPO');

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "modulo" "NotificacionModuloDb" NOT NULL DEFAULT 'TIEMPO',
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "destinatarioRol" TEXT NOT NULL DEFAULT 'gerente',
    "empleadoId" TEXT,
    "empleadoNombre" TEXT,
    "proyectoId" TEXT,
    "proyectoCod" TEXT,
    "fechaIso" TEXT,
    "registrosCount" INTEGER NOT NULL DEFAULT 1,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_destinatarioRol_leida_createdAt_idx" ON "Notificacion"("destinatarioRol", "leida", "createdAt");
