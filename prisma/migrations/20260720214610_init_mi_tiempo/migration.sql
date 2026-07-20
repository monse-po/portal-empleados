-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistroTiempo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legacyId" TEXT,
    "codigo" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "subproyecto" TEXT,
    "actividad" TEXT NOT NULL,
    "tipoHora" TEXT NOT NULL,
    "horas" REAL NOT NULL,
    "fecha" DATETIME NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "comentarioRechazo" TEXT NOT NULL DEFAULT '',
    "aprobador" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistroTiempo_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistroTiempo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroTiempo_legacyId_key" ON "RegistroTiempo"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroTiempo_codigo_key" ON "RegistroTiempo"("codigo");

-- CreateIndex
CREATE INDEX "RegistroTiempo_empleadoId_fecha_idx" ON "RegistroTiempo"("empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroTiempo_estado_idx" ON "RegistroTiempo"("estado");
