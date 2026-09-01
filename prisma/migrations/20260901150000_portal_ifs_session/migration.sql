-- CreateTable
CREATE TABLE "PortalIfsSession" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalIfsSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalIfsSession_email_idx" ON "PortalIfsSession"("email");

-- CreateIndex
CREATE INDEX "PortalIfsSession_expiresAt_idx" ON "PortalIfsSession"("expiresAt");
