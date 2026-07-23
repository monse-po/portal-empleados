import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import {
  formatProyectoAprobacion,
  hojaNoFromRegistro,
  isoToDmy,
  proyCodAprobacion,
} from "@/src/lib/tiempo-bridge";

export type NotificacionUi = {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  href: string;
  createdAt: string;
  registrosCount: number;
};

export const NOTIF_ROL_GERENTE = "gerente" as const;
export const NOTIF_TIPO_TIEMPO_ENVIO = "TIEMPO_ENVIO_DIA" as const;

type NotificacionRow = {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  href: string | null;
  createdAt: Date;
  registrosCount: number;
};

export function toNotificacionUi(row: NotificacionRow): NotificacionUi {
  return {
    id: row.id,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: row.leida,
    href: row.href ?? "/aprobacion-tiempo",
    createdAt: row.createdAt.toISOString(),
    registrosCount: row.registrosCount,
  };
}

function buildAprobacionHref(proyectoCod: string, hojaNo?: string): string {
  const params = new URLSearchParams({ proy: proyectoCod });
  if (hojaNo) params.set("no", hojaNo);
  return `/aprobacion-tiempo?${params.toString()}`;
}

/** Una notificación por envío (clic en "Enviar a aprobación"), no por línea. */
export function buildNotificacionesTiempoEnvio(
  registros: RegistroMock[],
): Array<{
  tipo: string;
  titulo: string;
  mensaje: string;
  empleadoId: string;
  empleadoNombre: string;
  proyectoId: string;
  proyectoCod: string;
  fechaIso: string;
  registrosCount: number;
  href: string;
}> {
  if (!registros.length) return [];

  const empleadoId = SESSION_EMPLEADO.cedula.replace(/\./g, "");
  const empleadoNombre = SESSION_EMPLEADO.nombre;
  const fechaIso = registros[0].fecha;
  const fechaLegible = isoToDmy(fechaIso);
  const count = registros.length;
  const proyIds = [...new Set(registros.map((reg) => reg.proy))];
  const unicoProyecto = proyIds.length === 1;
  const sample = registros[0];
  const proyectoId = sample.proy;
  const proyectoCod = proyCodAprobacion(sample.proy);

  let mensaje: string;
  let href: string;

  if (count === 1) {
    const hojaNo = hojaNoFromRegistro(sample);
    const proyLabel = formatProyectoAprobacion(sample.proy);
    mensaje = `${empleadoNombre} envió ${hojaNo} del ${fechaLegible} · ${proyLabel}`;
    href = buildAprobacionHref(proyectoCod, hojaNo);
  } else if (unicoProyecto) {
    const proyLabel = formatProyectoAprobacion(sample.proy);
    mensaje = `${empleadoNombre} envió ${count} registros del ${fechaLegible} · ${proyLabel}`;
    href = buildAprobacionHref(proyectoCod);
  } else {
    mensaje = `${empleadoNombre} envió ${count} registros del ${fechaLegible} · ${proyIds.length} proyectos`;
    href = "/aprobacion-tiempo";
  }

  return [
    {
      tipo: NOTIF_TIPO_TIEMPO_ENVIO,
      titulo: "Horas pendientes de aprobación",
      mensaje,
      empleadoId,
      empleadoNombre,
      proyectoId: unicoProyecto ? proyectoId : proyIds[0],
      proyectoCod: unicoProyecto ? proyectoCod : proyCodAprobacion(proyIds[0]),
      fechaIso,
      registrosCount: count,
      href,
    },
  ];
}
