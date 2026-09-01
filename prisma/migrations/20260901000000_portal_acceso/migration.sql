-- CreateTable
CREATE TABLE "PortalAcceso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "empNo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalAcceso_email_key" ON "PortalAcceso"("email");

-- CreateIndex
CREATE INDEX "PortalAcceso_activo_idx" ON "PortalAcceso"("activo");
