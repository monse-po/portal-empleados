"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAnticiposRegistrosTab } from "@/src/lib/anticipos-filtros";
import {
  anticipoToAprobacion,
  aplicarTimelineAprobacion,
  estadoEmpleadoDesdeAccion,
  type IngresarAnticipoHandler,
  type RetirarAnticipoHandler,
  type SyncAnticipoAccion,
} from "@/src/lib/anticipos-bridge";
import {
  cloneInitialAnticipos,
  cloneInitialExtras,
  countAnticiposTab,
  getDirectorProyecto,
  hoyDMY,
  nuevoCodigoAnticipo,
  SESSION_EMPLEADO,
  type Anticipo,
  type AnticipoExtra,
  type AnticipoTab,
  type AnticipoTipo,
} from "@/src/lib/mis-anticipos-mock";

export type LanzarAnticipoInput = {
  tipo: AnticipoTipo;
  proyId: string;
  proyN: string;
  monto: number;
  div: string;
  motivo: string;
  compania: string;
  empCompania: string;
  paraOtro: boolean;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  beneficiarioCedula?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  tipoViaje?: "nacional" | "internacional";
};

type AnticiposContextValue = {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  tab: AnticipoTab;
  setTab: (tab: AnticipoTab) => void;
  tabCounts: { pendientes: number; disponibles: number };
  registrosActuales: Anticipo[];
  lanzarAnticipo: (input: LanzarAnticipoInput) => string | null;
  cancelarAnticipo: (no: string) => void;
  sincronizarDesdeAprobacion: (
    no: string,
    accion: SyncAnticipoAccion,
    comentario?: string,
  ) => void;
  getAnticipo: (no: string) => Anticipo | undefined;
  getExtra: (no: string) => AnticipoExtra | undefined;
};

const AnticiposContext = createContext<AnticiposContextValue | null>(null);

type AnticiposProviderProps = {
  children: ReactNode;
  onIngresarSolicitud?: IngresarAnticipoHandler;
  onRetirarSolicitud?: RetirarAnticipoHandler;
};

export function AnticiposProvider({
  children,
  onIngresarSolicitud,
  onRetirarSolicitud,
}: AnticiposProviderProps) {
  const [anticipos, setAnticipos] = useState(cloneInitialAnticipos);
  const [extras, setExtras] = useState(cloneInitialExtras);
  const [tab, setTab] = useState<AnticipoTab>("pendientes");

  const lanzarAnticipo = useCallback(
    (input: LanzarAnticipoInput): string | null => {
      const no = nuevoCodigoAnticipo(input.tipo, anticipos);
      const fecha = hoyDMY();
      const ahora = `${fecha} · ahora`;
      const sessionId = SESSION_EMPLEADO.cedula.replace(/\./g, "");
      const benefId = input.paraOtro
        ? (input.beneficiarioId ?? "").replace(/\./g, "")
        : sessionId;

      const registro: Anticipo = {
        no,
        fecha,
        proy: input.proyId,
        proyN: input.proyN,
        tipo: input.tipo,
        div: input.div,
        monto: input.monto,
        motivo: input.motivo,
        estado: "Lanzado",
        disponible: false,
        aprobador: getDirectorProyecto(input.proyId)?.codigo ?? null,
        fechaAprob: null,
        pago: "Pendiente",
        solicitante: SESSION_EMPLEADO.nombre,
        solicitanteId: sessionId,
        beneficiarioId: benefId,
        beneficiarioNombre: input.paraOtro
          ? input.beneficiarioNombre
          : SESSION_EMPLEADO.nombre,
        cedula: input.paraOtro
          ? input.beneficiarioCedula ?? input.beneficiarioId
          : SESSION_EMPLEADO.cedula,
        paraOtro: input.paraOtro,
      };

      const extra: AnticipoExtra = {
        compania: input.compania,
        empCompania: input.empCompania,
        empId: benefId,
        tl: [
          {
            accion: "Solicitud lanzada",
            usuario: SESSION_EMPLEADO.nombre,
            fecha: ahora,
            icon: "send",
            color: "#1e40af",
          },
          {
            accion: "Esperando aprobación",
            usuario: "Sistema",
            fecha: "Pendiente",
            icon: "clock",
            color: "#854d0e",
          },
        ],
      };

      if (input.tipo === "Viaje" && input.fechaIda) {
        extra.fechaIda = input.fechaIda;
        extra.fechaRegreso = input.fechaRegreso;
        extra.destino = input.destino;
        extra.tipoViaje = input.tipoViaje;
      }

      setAnticipos((prev) => ({ ...prev, [no]: registro }));
      setExtras((prev) => ({ ...prev, [no]: extra }));
      onIngresarSolicitud?.(anticipoToAprobacion(registro, extra));
      return no;
    },
    [anticipos, onIngresarSolicitud],
  );

  const cancelarAnticipo = useCallback(
    (no: string) => {
      let cancelled = false;
      setAnticipos((prev) => {
        const item = prev[no];
        if (!item || item.estado !== "Lanzado") return prev;
        cancelled = true;
        return {
          ...prev,
          [no]: {
            ...item,
            disponible: true,
            estado: "Cancelado",
            pago: "—",
          },
        };
      });
      setExtras((prev) => {
        const ex = prev[no];
        if (!ex) return prev;
        const tl = ex.tl.filter((t) => !t.accion.startsWith("Esperando"));
        return {
          ...prev,
          [no]: {
            ...ex,
            tl: [
              ...tl,
              {
                accion: "Cancelado por el empleado",
                usuario: SESSION_EMPLEADO.nombre,
                fecha: hoyDMY(),
                icon: "ban",
                color: "#6b7280",
              },
            ],
          },
        };
      });
      if (cancelled) onRetirarSolicitud?.(no);
    },
    [onRetirarSolicitud],
  );

  const sincronizarDesdeAprobacion = useCallback(
    (no: string, accion: SyncAnticipoAccion, comentario?: string) => {
      const estado = estadoEmpleadoDesdeAccion(accion);
      const fecha = hoyDMY();

      setAnticipos((prev) => {
        const item = prev[no];
        if (!item || item.estado !== "Lanzado") return prev;
        return {
          ...prev,
          [no]: {
            ...item,
            estado,
            fechaAprob: fecha,
            // Aprobado demo → Pagado + Historial; rechazo → Historial.
            disponible: true,
            pago: accion === "aprobado" ? "Pagado" : "—",
          },
        };
      });

      setExtras((prev) => {
        const ex = prev[no];
        if (!ex) return prev;
        return {
          ...prev,
          [no]: aplicarTimelineAprobacion(ex, accion, comentario ?? "", fecha),
        };
      });
    },
    [],
  );

  const tabCounts = useMemo(() => countAnticiposTab(anticipos), [anticipos]);
  const registrosActuales = useMemo(
    () => getAnticiposRegistrosTab(anticipos, tab),
    [anticipos, tab],
  );

  const value = useMemo(
    () => ({
      anticipos,
      extras,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      lanzarAnticipo,
      cancelarAnticipo,
      sincronizarDesdeAprobacion,
      getAnticipo: (no: string) => anticipos[no],
      getExtra: (no: string) => extras[no],
    }),
    [
      anticipos,
      extras,
      tab,
      tabCounts,
      registrosActuales,
      lanzarAnticipo,
      cancelarAnticipo,
      sincronizarDesdeAprobacion,
    ],
  );

  return (
    <AnticiposContext.Provider value={value}>
      {children}
    </AnticiposContext.Provider>
  );
}

export function useAnticipos() {
  const ctx = useContext(AnticiposContext);
  if (!ctx) {
    throw new Error("useAnticipos debe usarse dentro de AnticiposProvider");
  }
  return ctx;
}
