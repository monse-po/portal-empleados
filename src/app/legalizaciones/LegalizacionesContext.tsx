"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cloneInitialLegalizaciones,
  countLegalizacionesTab,
  finalizeLineasOnEnvio,
  getLegalizacionesTab,
  hoyDMY,
  nuevoCodigoLegalizacion,
  puedeLegalizarAnticipo,
  resumenLegalizacionDesdeLineas,
  type CrearLegalizacionInput,
  type Legalizacion,
  type LegalizacionTab,
} from "@/src/lib/legalizaciones-mock";
import { cloneInitialAnticipos } from "@/src/lib/mis-anticipos-mock";

type LegalizacionesContextValue = {
  legalizaciones: Record<string, Legalizacion>;
  tab: LegalizacionTab;
  setTab: (tab: LegalizacionTab) => void;
  tabCounts: { pendientes: number; historial: number };
  registrosActuales: Legalizacion[];
  getLegalizacion: (no: string) => Legalizacion | undefined;
  crearLegalizacion: (input: CrearLegalizacionInput) => string;
};

const LegalizacionesContext = createContext<LegalizacionesContextValue | null>(
  null,
);

export function LegalizacionesProvider({ children }: { children: ReactNode }) {
  const [legalizaciones, setLegalizaciones] = useState(
    cloneInitialLegalizaciones,
  );
  const [tab, setTab] = useState<LegalizacionTab>("pendientes");

  const getLegalizacion = useCallback(
    (no: string) => legalizaciones[no],
    [legalizaciones],
  );

  const crearLegalizacion = useCallback((input: CrearLegalizacionInput) => {
    if (input.tipo === "Con anticipo") {
      const anticipo = input.anticipoNo
        ? cloneInitialAnticipos()[input.anticipoNo]
        : undefined;
      if (!anticipo || !puedeLegalizarAnticipo(anticipo)) return "";
    }

    let createdNo = "";
    setLegalizaciones((prev) => {
      if (
        input.tipo === "Con anticipo" &&
        input.anticipoNo &&
        Object.values(prev).some((l) => l.anticipoNo === input.anticipoNo)
      ) {
        return prev;
      }

      const no = nuevoCodigoLegalizacion(prev);
      createdNo = no;
      const resumen = resumenLegalizacionDesdeLineas(input.lineas);
      const lineas = input.enviar
        ? finalizeLineasOnEnvio(input.lineas, prev)
        : input.lineas;
      return {
        ...prev,
        [no]: {
          no,
          fecha: hoyDMY(),
          tipo: input.tipo,
          concepto: resumen.concepto,
          monto: resumen.monto,
          div: resumen.div,
          estado: input.enviar ? "En revisión" : "Borrador",
          motivo: input.comentario?.trim() || resumen.concepto,
          anticipoNo: input.anticipoNo,
          tarjetaRef: input.tarjetaRef,
          destino: input.destino,
          lineas,
          comentario: input.comentario,
          disponible: false,
        },
      };
    });
    return createdNo;
  }, []);

  const tabCounts = useMemo(
    () => ({
      pendientes: countLegalizacionesTab(legalizaciones, "pendientes"),
      historial: countLegalizacionesTab(legalizaciones, "historial"),
    }),
    [legalizaciones],
  );

  const registrosActuales = useMemo(
    () => getLegalizacionesTab(legalizaciones, tab),
    [legalizaciones, tab],
  );

  const value = useMemo(
    () => ({
      legalizaciones,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      getLegalizacion,
      crearLegalizacion,
    }),
    [legalizaciones, tab, tabCounts, registrosActuales, getLegalizacion, crearLegalizacion],
  );

  return (
    <LegalizacionesContext.Provider value={value}>
      {children}
    </LegalizacionesContext.Provider>
  );
}

export function useLegalizaciones() {
  const ctx = useContext(LegalizacionesContext);
  if (!ctx) {
    throw new Error(
      "useLegalizaciones debe usarse dentro de LegalizacionesProvider",
    );
  }
  return ctx;
}
