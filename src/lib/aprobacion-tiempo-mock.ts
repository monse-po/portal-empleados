import { dmyToSortKey, formatProyectoAprobacionPorCod, nombreProyectoPorCodAprobacion } from "@/src/lib/tiempo-bridge";
import { HOY_MOCK } from "@/src/lib/mi-tiempo-mock";

export type EstadoAprobacion = "" | "Aprobado" | "Rechazado" | "Anulado";

export type HojaAprobacion = {
  no: string;
  fecha: string;
  compania: string;
  proy: string;
  subproy: string;
  tipo: string;
  solicitante: string;
  cedula: string;
  nombre: string;
  actividad: string;
  horas: string;
  comentarioEmpleado: string;
  aprobador: string;
  registroId?: string;
  estadoApro?: EstadoAprobacion;
  comentarioApro?: string;
  fechaApro?: string;
};

export type ProyInfo = {
  cliente: string;
  lider: string;
  inicio: string;
  color: string;
};

export const PROY_INFO: Record<string, ProyInfo> = {
  PRY2024003: {
    cliente: "Ecopetrol S.A.",
    lider: "María Restrepo",
    inicio: "Ene 2024",
    color: "#15803d",
  },
  PRY2025001: {
    cliente: "Cerrejón",
    lider: "Carlos Rivas",
    inicio: "Feb 2025",
    color: "#014783",
  },
  PRY2025002: {
    cliente: "ISA Intercolombia",
    lider: "Andrés Gómez",
    inicio: "Mar 2025",
    color: "#9a3412",
  },
};

const SEED: Record<string, HojaAprobacion> = {
  HT20260089: {
    no: "HT20260089",
    fecha: "25/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-201 · Ingeniería de detalle",
    tipo: "DN",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Diseño estructural",
    horas: "8h",
    comentarioEmpleado:
      "Desarrollo de planos estructurales del nivel 3, revisión de cargas y predimensionamiento de elementos.",
    aprobador: "",
  },
  HT20260088: {
    no: "HT20260088",
    fecha: "25/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-201 · Ingeniería de detalle",
    tipo: "HED",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Modelado BIM",
    horas: "2h",
    comentarioEmpleado:
      "Ajustes de modelo BIM solicitados por interventoría fuera de horario.",
    aprobador: "",
  },
  HT20260087: {
    no: "HT20260087",
    fecha: "24/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025002"),
    subproy: "SUB-310 · Diseño hidrosanitario",
    tipo: "DN",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    actividad: "Revisión de planos",
    horas: "8h",
    comentarioEmpleado:
      "Revisión y marcado de planos hidrosanitarios para entrega al cliente.",
    aprobador: "",
  },
  HT20260086: {
    no: "HT20260086",
    fecha: "24/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-202 · Coordinación",
    tipo: "DN",
    solicitante: "Sandra López",
    cedula: "43.789.012",
    nombre: "Sandra López Mejía",
    actividad: "Coordinación cliente",
    horas: "6.5h",
    comentarioEmpleado:
      "Reunión de coordinación con el cliente y seguimiento de pendientes del acta anterior.",
    aprobador: "",
  },
  HT20260085: {
    no: "HT20260085",
    fecha: "23/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2024003"),
    subproy: "SUB-105 · Supervisión de obra",
    tipo: "DN",
    solicitante: "Jorge Peña",
    cedula: "79.456.789",
    nombre: "Jorge Peña Quintero",
    actividad: "Supervisión obra",
    horas: "8h",
    comentarioEmpleado:
      "Supervisión de avance de obra y verificación de cumplimiento del cronograma.",
    aprobador: "",
  },
  HT20260081: {
    no: "HT20260081",
    fecha: "15/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-203 · Topografía",
    tipo: "DN",
    solicitante: "María Camila Torres",
    cedula: "1.020.345.678",
    nombre: "María Camila Torres Vélez",
    actividad: "Levantamiento topográfico",
    horas: "8h",
    comentarioEmpleado: "Levantamiento topográfico de campo.",
    estadoApro: "Aprobado",
    comentarioApro: "Horas conformes al avance del proyecto.",
    fechaApro: "16/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260080: {
    no: "HT20260080",
    fecha: "18/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-201 · Ingeniería de detalle",
    tipo: "DN",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Entrega de planos",
    horas: "4h",
    comentarioEmpleado: "Entrega parcial de planos estructurales.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado — avance conforme.",
    fechaApro: "19/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260076: {
    no: "HT20260076",
    fecha: "22/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-201 · Ingeniería de detalle",
    tipo: "DN",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Diseño estructural",
    horas: "8h",
    comentarioEmpleado: "Planos estructurales del nivel 2, ya revisados.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado — acumulado de la misma actividad.",
    fechaApro: "23/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260078: {
    no: "HT20260078",
    fecha: "17/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025001"),
    subproy: "SUB-201 · Ingeniería de detalle",
    tipo: "HED",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Ajustes urgentes",
    horas: "3h",
    comentarioEmpleado: "Horas extra no coordinadas con el líder.",
    estadoApro: "Rechazado",
    comentarioApro: "Rechazado — falta autorización previa de horas extra.",
    fechaApro: "18/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260079: {
    no: "HT20260079",
    fecha: "13/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025002"),
    subproy: "SUB-311 · Documentación",
    tipo: "DN",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    actividad: "Documentación técnica",
    horas: "7h",
    comentarioEmpleado: "Elaboración de memorias de cálculo.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado.",
    fechaApro: "14/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260075: {
    no: "HT20260075",
    fecha: "09/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2024003"),
    subproy: "SUB-105 · Supervisión de obra",
    tipo: "HED",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    actividad: "Cierre de entregable",
    horas: "3h",
    comentarioEmpleado: "Horas extra para cierre de entregable del hito.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado conforme al cronograma del proyecto.",
    fechaApro: "10/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260077: {
    no: "HT20260077",
    fecha: "11/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2025002"),
    subproy: "SUB-310 · Diseño hidrosanitario",
    tipo: "HED",
    solicitante: "María Camila Torres",
    cedula: "1.020.345.678",
    nombre: "María Camila Torres Vélez",
    actividad: "Soporte equipo",
    horas: "4h",
    comentarioEmpleado: "Horas extra de soporte al equipo.",
    estadoApro: "Rechazado",
    comentarioApro:
      "Rechazado — las horas extra no fueron autorizadas previamente. Coordinar con el líder de proyecto.",
    fechaApro: "12/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
  HT20260072: {
    no: "HT20260072",
    fecha: "07/04/2026",
    compania: "HMVINGCO",
    proy: formatProyectoAprobacionPorCod("PRY2024003"),
    subproy: "SUB-106 · Planos",
    tipo: "HA",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    actividad: "Reproceso de planos",
    horas: "5h",
    comentarioEmpleado: "Horas por reproceso de planos.",
    estadoApro: "Rechazado",
    comentarioApro:
      "Rechazado — el reproceso no es imputable a horas adicionales del proyecto.",
    fechaApro: "08/04/2026",
    aprobador: "Carlos Rivas Mora",
  },
};

function generateBulk(): Record<string, HojaAprobacion> {
  const proys = [
    formatProyectoAprobacionPorCod("PRY2025001"),
    formatProyectoAprobacionPorCod("PRY2025002"),
    formatProyectoAprobacionPorCod("PRY2024003"),
  ];
  const emps: [string, string, string][] = [
    ["Ana Martínez", "52.012.345", "Ana Martínez Rueda"],
    ["Luis Herrera", "80.234.567", "Luis Herrera Cano"],
    ["Sandra López", "43.789.012", "Sandra López Mejía"],
    ["Jorge Peña", "79.456.789", "Jorge Peña Quintero"],
    ["María Camila Torres", "1.020.345.678", "María Camila Torres Vélez"],
    ["Diego Ramírez", "94.111.222", "Diego Ramírez Soto"],
    ["Paula Gómez", "63.555.444", "Paula Gómez Ardila"],
    ["Andrés Suárez", "80.777.888", "Andrés Suárez León"],
  ];
  const subs = [
    "SUB-201 · Ingeniería de detalle",
    "SUB-202 · Coordinación",
    "SUB-203 · Topografía",
    "SUB-105 · Supervisión de obra",
    "SUB-310 · Diseño hidrosanitario",
    "SUB-106 · Planos",
    "SUB-311 · Documentación",
  ];
  const acts = [
    "Diseño estructural",
    "Modelado BIM",
    "Revisión de planos",
    "Coordinación cliente",
    "Levantamiento topográfico",
    "Supervisión de obra",
    "Memorias de cálculo",
    "Documentación técnica",
  ];
  const tipos = ["DN", "DN", "DN", "HED", "HA", "HEN", "RF"];
  const coms = [
    "Avance conforme al cronograma.",
    "Ajustes solicitados por interventoría.",
    "Trabajo de campo del día.",
    "Reunión de coordinación con el cliente.",
    "",
  ];
  const hrs = ["8h", "8h", "6.5h", "4h", "2h", "7h", "5h", "3h"];
  const counts = [40, 15, 12];
  const out: Record<string, HojaAprobacion> = {};
  let id = 20260200;

  proys.forEach((pc, pi) => {
    for (let i = 0; i < counts[pi]; i++) {
      const e = emps[(i + pi * 3) % emps.length];
      const dia = String(((i * 3 + pi) % 27) + 1).padStart(2, "0");
      const no = `HT${id++}`;
      const estado =
        i % 7 === 0 ? "Rechazado" : i % 5 === 0 ? "Aprobado" : "";
      out[no] = {
        no,
        fecha: `${dia}/04/2026`,
        compania: "HMVINGCO",
        proy: pc,
        subproy: subs[(i + pi) % subs.length],
        tipo: tipos[i % tipos.length],
        solicitante: e[0],
        cedula: e[1],
        nombre: e[2],
        actividad: acts[(i + pi) % acts.length],
        horas: hrs[i % hrs.length],
        comentarioEmpleado: coms[i % coms.length],
        aprobador: estado ? "Carlos Rivas Mora" : "",
        ...(estado
          ? {
              estadoApro: estado as "Aprobado" | "Rechazado",
              comentarioApro:
                estado === "Aprobado"
                  ? "Aprobado — horas conformes."
                  : "Rechazado — no autorizado.",
              fechaApro: `${dia}/04/2026`,
            }
          : {}),
      };
    }
  });

  return out;
}

/** Seed local para UI (pendientes + resueltas) sin IFS. */
export function cloneInitialHojas(): Record<string, HojaAprobacion> {
  return { ...SEED, ...generateBulk() };
}

export function proyKey(proy: string): string {
  return (proy || "").split("·")[0].trim();
}

export function proyNombre(proy: string): string {
  const p = (proy || "").split("·");
  return (p[1] || "").trim();
}

export function horasNum(horas: string): number {
  return parseFloat(horas) || 0;
}

export function hoyDMY(): string {
  return new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function splitSubproy(subproy: string) {
  const parts = (subproy || "").split("·").map((x) => x.trim());
  return { code: parts[0] || "—", name: parts[1] || "" };
}

export function getProyectosList(
  hojas: Record<string, HojaAprobacion>,
): { cod: string; nombre: string }[] {
  const map: Record<string, string> = {};
  Object.values(hojas).forEach((s) => {
    const k = proyKey(s.proy);
    if (k && !(k in map)) {
      map[k] =
        nombreProyectoPorCodAprobacion(k) ??
        (proyNombre(s.proy) || k);
    }
  });
  return Object.keys(map)
    .sort()
    .map((cod) => ({ cod, nombre: map[cod] }));
}

export function getProyConMasPendientes(
  hojas: Record<string, HojaAprobacion>,
): string {
  const counts: Record<string, number> = {};
  Object.values(hojas).forEach((s) => {
    if (!s.estadoApro) {
      const k = proyKey(s.proy);
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
  });
  let best = "";
  let max = -1;
  Object.entries(counts).forEach(([k, n]) => {
    if (n > max) {
      max = n;
      best = k;
    }
  });
  return best;
}

export type ProyPendientesStats = { count: number; horas: number };

export type ProyResueltasStats = { aprobadas: number; rechazadas: number };

function roundHoras(x: number): number {
  return Math.round(x * 10) / 10;
}

export function getPendientesStatsPorProy(
  hojas: Record<string, HojaAprobacion>,
): Record<string, ProyPendientesStats> {
  const stats: Record<string, ProyPendientesStats> = {};
  for (const s of Object.values(hojas)) {
    if (s.estadoApro) continue;
    const k = proyKey(s.proy);
    if (!k) continue;
    if (!stats[k]) stats[k] = { count: 0, horas: 0 };
    stats[k].count += 1;
    stats[k].horas += horasNum(s.horas);
  }
  for (const k of Object.keys(stats)) {
    stats[k].horas = roundHoras(stats[k].horas);
  }
  return stats;
}

export function getResueltasStatsPorProy(
  hojas: Record<string, HojaAprobacion>,
): Record<string, ProyResueltasStats> {
  const stats: Record<string, ProyResueltasStats> = {};
  for (const s of Object.values(hojas)) {
    if (!s.estadoApro) continue;
    const k = proyKey(s.proy);
    if (!k) continue;
    if (!stats[k]) stats[k] = { aprobadas: 0, rechazadas: 0 };
    if (s.estadoApro === "Aprobado") stats[k].aprobadas += 1;
    else if (s.estadoApro === "Rechazado") stats[k].rechazadas += 1;
  }
  return stats;
}

function isMesReferencia(fechaDmy: string): boolean {
  const [, m, y] = fechaDmy.split("/").map(Number);
  const ref = HOY_MOCK;
  return y === ref.getFullYear() && m === ref.getMonth() + 1;
}

export type AprobacionKpis = {
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  horasPendientes: number;
  horasAprobadas: number;
};

export function getAprobacionKpis(
  hojas: Record<string, HojaAprobacion>,
): AprobacionKpis {
  const all = Object.values(hojas);
  const round = (x: number) => Math.round(x * 10) / 10;
  return {
    pendientes: all.filter((s) => !s.estadoApro).length,
    aprobadas: all.filter(
      (s) => s.estadoApro === "Aprobado" && isMesReferencia(s.fecha),
    ).length,
    rechazadas: all.filter(
      (s) => s.estadoApro === "Rechazado" && isMesReferencia(s.fecha),
    ).length,
    horasPendientes: round(
      all
        .filter((s) => !s.estadoApro)
        .reduce((a, s) => a + horasNum(s.horas), 0),
    ),
    horasAprobadas: round(
      all
        .filter(
          (s) => s.estadoApro === "Aprobado" && isMesReferencia(s.fecha),
        )
        .reduce((a, s) => a + horasNum(s.horas), 0),
    ),
  };
}

export function filterHojasByTab(
  hojas: Record<string, HojaAprobacion>,
  tab: "pend" | "res",
): HojaAprobacion[] {
  return Object.values(hojas)
    .filter((s) => (tab === "pend" ? !s.estadoApro : !!s.estadoApro))
    .sort((a, b) => dmyToSortKey(b.fecha) - dmyToSortKey(a.fecha));
}

export function filterHojasByProyTab(
  hojas: Record<string, HojaAprobacion>,
  proyCod: string,
  tab: "pend" | "res",
): HojaAprobacion[] {
  return filterHojasByTab(hojas, tab).filter(
    (s) => proyKey(s.proy) === proyCod,
  );
}

export const APRO_PAGE_SIZE = 50;
