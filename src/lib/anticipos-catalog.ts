import type { LovItem } from "@/src/lib/anticipos-registro";

export const COMPANIAS = [
  { id: "HMVINGCO", label: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)" },
  { id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." },
  { id: "HMVPERU", label: "HMV Ingenieros Perú S.A.C." },
] as const;

export const DIVISAS_POR_COMPANIA: Record<
  string,
  { code: string; label: string; pre: string }[]
> = {
  HMVINGCO: [
    { code: "COP", label: "COP – Pesos colombianos", pre: "$" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
  HMVMEX: [
    { code: "MXN", label: "MXN – Peso mexicano", pre: "$" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
  HMVPERU: [
    { code: "PEN", label: "PEN – Sol peruano", pre: "S/" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
};

export const COMPANIAS_HMV: LovItem[] = [
  { id: "HMVINGCO", nombre: "HMV Ingenieros Ltda.", sub: "Colombia" },
  { id: "HMVMEX", nombre: "HMV Ingenieros México S.A. de C.V.", sub: "México" },
  { id: "HMVPERU", nombre: "HMV Ingenieros Perú S.A.C.", sub: "Perú" },
  { id: "HMVCHL", nombre: "HMV Ingenieros Chile SpA", sub: "Chile" },
  { id: "HMVECUAD", nombre: "HMV Ingenieros Ecuador S.A.", sub: "Ecuador" },
];

export type EmpleadoAnticipo = LovItem & {
  banco: string;
  tipo: string;
  cuenta: string;
  empresa: string;
  companias: { id: string; label: string }[];
};

/** Catálogo estático para "solicitar para otro" hasta integrar IFS HR */
export const EMPLEADOS_ANT: EmpleadoAnticipo[] = [
  {
    id: "1023456789",
    nombre: "Carlos Rivas Mora",
    sub: "EMP-001",
    banco: "Bancolombia",
    tipo: "Ahorros",
    cuenta: "4567890123",
    empresa: "HMVINGCO",
    companias: [
      { id: "HMVINGCO", label: "HMV Ingenieros Ltda. (Colombia)" },
      { id: "HMVCHL", label: "HMV Ingenieros Chile SpA" },
    ],
  },
  {
    id: "52874391",
    nombre: "María Fernanda López Torres",
    sub: "EMP-002",
    banco: "Davivienda",
    tipo: "Corriente",
    cuenta: "234-561234-5",
    empresa: "HMVINGCO",
    companias: [
      { id: "HMVINGCO", label: "HMV Ingenieros Ltda. (Colombia)" },
      { id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." },
    ],
  },
  {
    id: "80341256",
    nombre: "Carlos Andrés Martínez Ruiz",
    sub: "EMP-003",
    banco: "BBVA",
    tipo: "Ahorros",
    cuenta: "891-234567-8",
    empresa: "HMVMEX",
    companias: [{ id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." }],
  },
];

export type DestinoSel = {
  ciudad: string;
  dpto: string;
  pais: string;
  pCode: string;
  label: string;
};

export const DEST_CATALOG: Record<
  string,
  { nombre: string; departamentos: Record<string, { nombre: string; ciudades: string[] }> }
> = {
  CO: {
    nombre: "Colombia",
    departamentos: {
      ANT: { nombre: "Antioquia", ciudades: ["Medellín", "Bello", "Envigado"] },
      CUN: { nombre: "Cundinamarca", ciudades: ["Bogotá", "Chía", "Zipaquirá"] },
      VAC: { nombre: "Valle del Cauca", ciudades: ["Cali", "Palmira", "Buenaventura"] },
      ATL: { nombre: "Atlántico", ciudades: ["Barranquilla", "Soledad"] },
    },
  },
  US: {
    nombre: "Estados Unidos",
    departamentos: {
      FL: { nombre: "Florida", ciudades: ["Miami", "Orlando", "Tampa"] },
      TX: { nombre: "Texas", ciudades: ["Houston", "Dallas", "Austin"] },
    },
  },
  MX: {
    nombre: "México",
    departamentos: {
      CMX: { nombre: "Ciudad de México", ciudades: ["Ciudad de México", "Coyoacán"] },
      JAL: { nombre: "Jalisco", ciudades: ["Guadalajara", "Zapopan"] },
    },
  },
};

export function getEmpleadosPorEmpresa(empresaId: string): EmpleadoAnticipo[] {
  return EMPLEADOS_ANT.filter((e) => e.empresa === empresaId);
}

export function searchDestinos(query: string): DestinoSel[] {
  const q = query.trim().toLowerCase();
  const resultados: DestinoSel[] = [];
  for (const [pCode, pData] of Object.entries(DEST_CATALOG)) {
    for (const dData of Object.values(pData.departamentos)) {
      for (const ciudad of dData.ciudades) {
        resultados.push({
          ciudad,
          dpto: dData.nombre,
          pais: pData.nombre,
          pCode,
          label: `${ciudad}, ${dData.nombre}`,
        });
      }
    }
  }
  if (q) {
    return resultados.filter(
      (r) =>
        r.ciudad.toLowerCase().includes(q) ||
        r.dpto.toLowerCase().includes(q) ||
        r.pais.toLowerCase().includes(q),
    );
  }
  return resultados.filter((r) => r.pCode === "CO").slice(0, 8);
}

export function fmtMontoInput(value: string): string {
  const v = parseFloat(value.replace(/[.,]/g, "")) || 0;
  return v > 0 ? v.toLocaleString("es-CO") : "";
}

export function parseMontoInput(value: string): number {
  return parseFloat(value.replace(/[.,]/g, "")) || 0;
}

export const APROBADORES: Record<string, string> = {
  JCGO: "Carlos Méndez",
  MFLZ: "Marco F. López",
  ARGU: "Ana Rodríguez",
  LLINO: "Laura Lino",
};

export const DIRECTOR_POR_PROY: Record<
  string,
  { codigo: string; nombre: string }
> = {
  PRY2024001: { codigo: "JCGO", nombre: APROBADORES.JCGO },
  PRY2024003: { codigo: "ARGU", nombre: APROBADORES.ARGU },
  PRY2025002: { codigo: "MFLZ", nombre: APROBADORES.MFLZ },
};

export function getDirectorProyecto(proyId: string | null | undefined) {
  if (!proyId) return null;
  return DIRECTOR_POR_PROY[proyId] ?? null;
}

export const PRE_MAP: Record<string, string> = {
  COP: "$",
  USD: "US$",
  MXN: "$",
  PEN: "S/",
};

export function formatMonto(monto: number, div = "COP"): string {
  const pre = PRE_MAP[div] || "$";
  return `${pre} ${monto.toLocaleString("es-CO")}`;
}

export function nombreAprobador(codigo: string | null): string | null {
  if (!codigo || codigo === "—") return null;
  return APROBADORES[codigo] || codigo;
}
