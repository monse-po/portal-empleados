import type { IconName } from "@/src/components/ui/Icon";
import type { AnticipoTipo } from "@/src/lib/mis-anticipos-mock";

/** Plantilla para repetir un registro de horas (fecha = hoy). */
export type TiempoPlantilla = {
  proy: string;
  sub: string;
  act: string;
  tipo?: string;
  horas?: string;
};

export type RecienteModulo = "tiempo" | "anticipos" | "legalizaciones";

export type RecienteItem = {
  id: string;
  modulo: RecienteModulo;
  href: string;
  hrefPath: string;
  tipoLabel: string;
  titulo: string;
  detalle: string;
  cuando: string;
  icon: IconName;
  tiempo?: TiempoPlantilla;
  anticipo?: { tipo: AnticipoTipo; proyId: string };
};

/** Prototipo: últimas combinaciones para repetir, no para ver el registro viejo. */
export const RECIENTES_DUMMY: RecienteItem[] = [
  {
    id: "r1",
    modulo: "tiempo",
    href: "/hoja-tiempo?repetir=r1",
    hrefPath: "/hoja-tiempo",
    tipoLabel: "Tiempo",
    titulo: "Repetir horas",
    detalle: "PRY2026001 · Ingeniería de detalle · Diseño · 8",
    cuando: "Hoy, 10:14",
    icon: "clock",
    tiempo: {
      proy: "PRY2026001",
      sub: "Ingeniería de detalle",
      act: "Diseño",
      tipo: "DN",
      horas: "8",
    },
  },
  {
    id: "r2",
    modulo: "anticipos",
    href: "/mis-anticipos?nueva=1&tipo=Viaje&proy=PRY2024003",
    hrefPath: "/mis-anticipos",
    tipoLabel: "Anticipo",
    titulo: "Nuevo anticipo",
    detalle: "Viaje · Mantenimiento Subestación 115kV",
    cuando: "Hoy, 9:02",
    icon: "wallet",
    anticipo: { tipo: "Viaje", proyId: "PRY2024003" },
  },
  {
    id: "r3",
    modulo: "tiempo",
    href: "/hoja-tiempo?repetir=r3",
    hrefPath: "/hoja-tiempo",
    tipoLabel: "Tiempo",
    titulo: "Repetir horas",
    detalle: "PRY2026005 · Obra civil · Supervisión en campo · 8",
    cuando: "Ayer, 17:40",
    icon: "clock",
    tiempo: {
      proy: "PRY2026005",
      sub: "Obra civil",
      act: "Supervisión en campo",
      tipo: "DN",
      horas: "8",
    },
  },
  {
    id: "r4",
    modulo: "anticipos",
    href: "/mis-anticipos?nueva=1&tipo=Gasto&proy=PRY2025002",
    hrefPath: "/mis-anticipos",
    tipoLabel: "Anticipo",
    titulo: "Nuevo anticipo",
    detalle: "Gasto · Ingeniería de Detalle Refinería",
    cuando: "25 ago",
    icon: "wallet",
    anticipo: { tipo: "Gasto", proyId: "PRY2025002" },
  },
  {
    id: "r5",
    modulo: "legalizaciones",
    href: "/legalizaciones?nueva=1",
    hrefPath: "/legalizaciones",
    tipoLabel: "Legalización",
    titulo: "Nueva legalización",
    detalle: "Misma combinación · Viáticos proyecto Beta",
    cuando: "25 ago",
    icon: "folderOpen",
  },
  {
    id: "r6",
    modulo: "tiempo",
    href: "/hoja-tiempo?repetir=r6",
    hrefPath: "/hoja-tiempo",
    tipoLabel: "Tiempo",
    titulo: "Repetir horas",
    detalle: "PRY2026010 · Coordinación · Reunión con cliente · 4",
    cuando: "21 ago",
    icon: "clock",
    tiempo: {
      proy: "PRY2026010",
      sub: "Coordinación",
      act: "Reunión con cliente",
      tipo: "DN",
      horas: "4",
    },
  },
];

export function recientesVisibles(
  pathVisible: (pathname: string) => boolean,
  limit = 5,
): RecienteItem[] {
  return RECIENTES_DUMMY.filter((item) => pathVisible(item.hrefPath)).slice(
    0,
    limit,
  );
}

export function recientePorId(id: string): RecienteItem | undefined {
  return RECIENTES_DUMMY.find((item) => item.id === id);
}
