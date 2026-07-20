import { RegistroEstadoDb } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/db";
import {
  PROYECTOS,
  REGISTROS_MOCK,
  type RegistroEstado,
} from "../src/lib/mi-tiempo-mock";
import { SESSION_EMPLEADO } from "../src/lib/mis-anticipos-mock";

const prisma = createPrismaClient();

const SESSION_ID = SESSION_EMPLEADO.cedula.replace(/\./g, "");

function mapEstado(estado: RegistroEstado): RegistroEstadoDb {
  switch (estado) {
    case "En revisión":
      return RegistroEstadoDb.EN_REVISION;
    case "Aprobado":
      return RegistroEstadoDb.APROBADO;
    case "Rechazado":
      return RegistroEstadoDb.RECHAZADO;
    default:
      return RegistroEstadoDb.REGISTRADO;
  }
}

function codigoFromLegacyId(legacyId: string): string {
  const suffix = legacyId.replace(/^r/i, "").padStart(6, "0");
  return `HTREG${suffix}`;
}

async function main() {
  await prisma.registroTiempo.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.empleado.deleteMany();

  await prisma.empleado.create({
    data: {
      id: SESSION_ID,
      nombre: SESSION_EMPLEADO.nombre,
    },
  });

  for (const proy of PROYECTOS) {
    await prisma.proyecto.create({
      data: {
        id: proy.id,
        nombre: proy.nombre,
        cliente: proy.sub,
      },
    });
  }

  let seq = 0;
  for (const arr of Object.values(REGISTROS_MOCK)) {
    for (const reg of arr) {
      seq += 1;
      await prisma.registroTiempo.create({
        data: {
          legacyId: reg.id,
          codigo: codigoFromLegacyId(reg.id),
          empleadoId: SESSION_ID,
          proyectoId: reg.proy,
          subproyecto: reg.subproy ?? null,
          actividad: reg.act,
          tipoHora: reg.tipo,
          horas: reg.horas,
          fecha: new Date(`${reg.fecha}T12:00:00.000Z`),
          comentario: reg.comentario ?? "",
          comentarioRechazo: reg.comentarioRechazo ?? "",
          aprobador: reg.aprobador ?? null,
          estado: mapEstado(reg.estado),
        },
      });
    }
  }

  console.log(`Seed OK: ${seq} registros de tiempo`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
