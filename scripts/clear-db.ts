/**
 * Vacía Mi Tiempo en Neon (sin re-seed de mocks).
 * Uso: npm run db:clear
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

import { createPrismaClient } from "../src/lib/db";

async function main() {
  const prisma = createPrismaClient();
  const url = process.env.DATABASE_URL ?? "";

  if (!url.startsWith("postgres")) {
    console.error("DATABASE_URL no apunta a Postgres. Abortando.");
    process.exit(1);
  }

  const before = await prisma.registroTiempo.count();
  await prisma.registroTiempo.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.empleado.deleteMany();

  console.log(`Neon limpio: ${before} registros eliminados.`);
  console.log("Mi Tiempo quedará vacío hasta conectar IFS o crear datos reales.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
