-- CreateEnum
CREATE TYPE "PortalAccesoRol" AS ENUM ('EMPLEADO', 'AUTORIZADOR', 'AMBOS');

-- AlterTable
ALTER TABLE "PortalAcceso" ADD COLUMN "rol" "PortalAccesoRol" NOT NULL DEFAULT 'EMPLEADO';

-- CreateIndex
CREATE INDEX "PortalAcceso_rol_idx" ON "PortalAcceso"("rol");

-- Seed UAT: empleado (solicitar) + autorizador (aprobar)
INSERT INTO "PortalAcceso" ("id", "email", "nombre", "empNo", "rol", "activo", "createdAt", "updatedAt")
VALUES
  (
    'uat_liz_lino',
    'liz.lino@veyron.com.mx',
    'Liz Lino',
    NULL,
    'EMPLEADO',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'uat_jcgarcia',
    'jcgarcia@h-mv.com',
    'JC García',
    NULL,
    'AUTORIZADOR',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("email") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "rol" = EXCLUDED."rol",
  "activo" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
