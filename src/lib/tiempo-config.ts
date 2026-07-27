import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";

/** Origen del tope diario de horas normales. */
export type TiempoJornadaSource = "ifs" | "sistema";

/**
 * Jornada diaria por compañía / país (configuración de sistema).
 * En producción vendrá de IFS (GetHoursSummary) o tabla de configuración;
 * aquí centralizamos el fallback del portal.
 */
export type TiempoJornadaCompania = {
  companyId: string;
  pais: string;
  /** Horas normales máximas registrables por día. */
  maxNormalHoursPerDay: number;
};

export const TIEMPO_JORNADA_POR_COMPANIA: Record<string, TiempoJornadaCompania> =
  {
    HMVINGCO: {
      companyId: "HMVINGCO",
      pais: "CO",
      maxNormalHoursPerDay: 8.5,
    },
    HMVMEX: {
      companyId: "HMVMEX",
      pais: "MX",
      maxNormalHoursPerDay: 9,
    },
    HMVPERU: {
      companyId: "HMVPERU",
      pais: "PE",
      maxNormalHoursPerDay: 8,
    },
  };

export const TIEMPO_JORNADA_DEFAULT_COMPANY_ID = "HMVINGCO";

export type TiempoJornadaLimite = {
  maxNormalHours: number;
  source: TiempoJornadaSource;
  companyId: string;
  pais: string;
};

export function getJornadaCompaniaConfig(
  companyId = SESSION_EMPLEADO.companiaDefault,
): TiempoJornadaCompania {
  return (
    TIEMPO_JORNADA_POR_COMPANIA[companyId] ??
    TIEMPO_JORNADA_POR_COMPANIA[TIEMPO_JORNADA_DEFAULT_COMPANY_ID]
  );
}

/** Tope diario desde configuración de sistema (sin IFS). */
export function getJornadaLimiteFromSistema(
  companyId = SESSION_EMPLEADO.companiaDefault,
): TiempoJornadaLimite {
  const cfg = getJornadaCompaniaConfig(companyId);
  return {
    maxNormalHours: cfg.maxNormalHoursPerDay,
    source: "sistema",
    companyId: cfg.companyId,
    pais: cfg.pais,
  };
}

export function scheduleSourceLabel(source: TiempoJornadaSource): string {
  return source === "ifs" ? "IFS" : "config.";
}
