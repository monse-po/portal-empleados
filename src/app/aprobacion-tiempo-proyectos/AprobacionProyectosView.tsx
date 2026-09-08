"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { BulkActionButtons } from "@/src/components/ui/BulkSelectionBar";
import {
  IfsConnectedChip,
  IfsStatusBanner,
} from "@/src/components/layout/IfsStatusBanner";
import { Icon } from "@/src/components/ui/Icon";
import { useToast } from "@/src/components/ui/Toast";
import {
  AnularModal,
  AprobarModal,
  RechazarModal,
} from "@/src/app/aprobacion-tiempo/AprobacionModals";
import { AprobacionFilterBar } from "@/src/app/aprobacion-tiempo/AprobacionFilterBar";
import {
  AprobacionProyectosLista,
  sortProyectosInbox,
} from "@/src/app/aprobacion-tiempo-proyectos/AprobacionProyectosLista";
import {
  AprobacionProyectosRegistrosTabla,
  esHojaPendiente,
  esHojaResuelta,
  hojaRegistroId,
} from "@/src/app/aprobacion-tiempo-proyectos/AprobacionProyectosRegistrosTabla";
import {
  mapApprovalTimesheetToHojas,
  mapApprovalTimesheetToHojasByProyecto,
  type HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";
import {
  applyAproFilters,
  hayFiltrosActivos,
  type AproFilterRule,
} from "@/src/lib/aprobacion-filtros";
import {
  getAprobacionKpisFromList,
  horasNum,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { toastAnulados } from "@/src/lib/tiempo-bridge";
import type { HojaNotificacionInput } from "@/src/lib/notificacion-tiempo";
import {
  getResumenProyectosAprobacionAction,
  resolverAprobacionTiempoAction,
} from "@/src/server/mi-tiempo-actions";
import { createNotificacionesTiempoDecisionAction } from "@/src/server/notificacion-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";
import { useTableSelection } from "@/src/lib/use-table-selection";

type Tab = "pend" | "res";
type DecisionScope = "registros" | "proyecto";

function roundHoras(n: number): number {
  return Math.round(n * 100) / 100;
}

function toHojaNotifInput(hoja: HojaAprobacion): HojaNotificacionInput {
  return {
    no: hoja.no,
    fecha: hoja.fecha,
    cedula: hoja.cedula,
    nombre: hoja.nombre,
    proy: hoja.proy,
  };
}

export function AprobacionProyectosView() {
  const { toast } = useToast();
  const [proyectos, setProyectos] = useState<HorasProyectoAprobacion[]>([]);
  const [raw, setRaw] = useState<unknown>({ value: [] });
  const [loaded, setLoaded] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsWarning, setIfsWarning] = useState<string | null>(null);
  const [filters, setFilters] = useState<AproFilterRule[]>([]);
  const [tab, setTab] = useState<Tab>("pend");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string | null>(
    null,
  );
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const [anularTargets, setAnularTargets] = useState<string[]>([]);
  const [decisionScope, setDecisionScope] = useState<DecisionScope>("registros");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const cargar = useCallback(async () => {
    const result = await getResumenProyectosAprobacionAction();
    setIfsWarning(result.warning ?? null);
    setProyectos(result.proyectos);
    setRaw(result.raw);
    setFromIfs(result.fromIfs);
    return result;
  }, []);

  useEffect(() => {
    void getIfsSessionStatusAction().then((status) => {
      setIfsConnected(status.connected);
      setIfsEmail(status.email ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void cargar()
      .then((result) => {
        if (cancelled) return;
        if (result.warning) toast(result.warning, "warn");
      })
      .catch(() => {
        if (!cancelled) {
          toast("No se pudo cargar el resumen por proyecto.", "danger");
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cargar, toast]);

  useEffect(() => {
    if (!loaded) return;
    const stillThere =
      proyectoSeleccionado &&
      proyectos.some((p) => p.codigo === proyectoSeleccionado);
    if (stillThere) return;
    const ordenados = sortProyectosInbox(proyectos);
    const first =
      ordenados.find((p) => p.pendienteIds.length > 0) ?? ordenados[0];
    setProyectoSeleccionado(first?.codigo ?? null);
  }, [loaded, proyectos, proyectoSeleccionado]);

  const proyectoActual = proyectoSeleccionado
    ? proyectos.find((p) => p.codigo === proyectoSeleccionado)
    : undefined;

  const hojas = useMemo(() => {
    if (!proyectoSeleccionado) return [];
    return mapApprovalTimesheetToHojasByProyecto(raw, proyectoSeleccionado);
  }, [proyectoSeleccionado, raw]);

  const hojasPend = useMemo(() => hojas.filter(esHojaPendiente), [hojas]);
  const hojasRes = useMemo(() => hojas.filter(esHojaResuelta), [hojas]);
  const hojasTabBase = tab === "pend" ? hojasPend : hojasRes;

  const hojasTab = useMemo(
    () => applyAproFilters(hojasTabBase, filters),
    [hojasTabBase, filters],
  );

  const tabCounts = {
    pend: hojasPend.length,
    res: hojasRes.length,
  };

  const kpis = useMemo(
    () =>
      getAprobacionKpisFromList(
        mapApprovalTimesheetToHojas(raw, { includeResolved: true }),
      ),
    [raw],
  );

  const selectedKeys = [...seleccion];
  const filtrosActivos = hayFiltrosActivos(filters);

  const handleTab = (next: Tab) => {
    setTab(next);
    clearSeleccion();
    setFilters([]);
  };

  const seleccionarProyecto = (codigo: string) => {
    if (codigo === proyectoSeleccionado) return;
    clearSeleccion();
    setFilters([]);
    setProyectoSeleccionado(codigo);
    const p = proyectos.find((item) => item.codigo === codigo);
    setTab(p && p.pendienteIds.length === 0 ? "res" : "pend");
  };

  const solicitarAprobacionRegistros = (ids: string[]) => {
    const pending = ids.filter((id) =>
      hojasPend.some((h) => hojaRegistroId(h) === id),
    );
    if (!pending.length) {
      toast("Selecciona al menos un registro con horas por aprobar", "danger");
      return;
    }
    setDecisionScope("registros");
    setAprobarTargets(pending);
  };

  const solicitarRechazoRegistros = (ids: string[]) => {
    const pending = ids.filter((id) =>
      hojasPend.some((h) => hojaRegistroId(h) === id),
    );
    if (!pending.length) {
      toast("Selecciona al menos un registro con horas por aprobar", "danger");
      return;
    }
    setDecisionScope("registros");
    setRechazarTargets(pending);
  };

  const solicitarAprobacionProyecto = (codigo: string) => {
    const p = proyectos.find((item) => item.codigo === codigo);
    if (!p?.pendienteIds.length) {
      toast("Ese proyecto ya no tiene horas por aprobar", "danger");
      return;
    }
    setDecisionScope("proyecto");
    setAprobarTargets([codigo]);
  };

  const solicitarRechazoProyecto = (codigo: string) => {
    const p = proyectos.find((item) => item.codigo === codigo);
    if (!p?.pendienteIds.length) {
      toast("Ese proyecto ya no tiene horas por aprobar", "danger");
      return;
    }
    setDecisionScope("proyecto");
    setRechazarTargets([codigo]);
  };

  const idsVisiblesPendientes = () => hojasTab.map(hojaRegistroId);

  const solicitarAprobacionTabla = () => {
    if (selectedKeys.length) {
      solicitarAprobacionRegistros(selectedKeys);
      return;
    }
    if (filtrosActivos) {
      solicitarAprobacionRegistros(idsVisiblesPendientes());
      return;
    }
    if (proyectoSeleccionado) solicitarAprobacionProyecto(proyectoSeleccionado);
  };

  const solicitarRechazoTabla = () => {
    if (selectedKeys.length) {
      solicitarRechazoRegistros(selectedKeys);
      return;
    }
    if (filtrosActivos) {
      solicitarRechazoRegistros(idsVisiblesPendientes());
      return;
    }
    if (proyectoSeleccionado) solicitarRechazoProyecto(proyectoSeleccionado);
  };

  const resolverTargets = (keys: string[]) => {
    if (!keys.length) {
      return { registroIds: [] as string[], horas: 0, label: "", empleado: "" };
    }
    if (decisionScope === "proyecto") {
      const p = proyectos.find((item) => item.codigo === keys[0]);
      return {
        registroIds: p?.pendienteIds ?? [],
        horas: p?.horasPendientes ?? 0,
        label: p?.codigo ?? keys[0],
        empleado: "Equipo",
      };
    }
    const picked = hojasPend.filter((h) => keys.includes(hojaRegistroId(h)));
    const horas = roundHoras(picked.reduce((s, h) => s + horasNum(h.horas), 0));
    if (picked.length === 1) {
      const h = picked[0];
      return {
        registroIds: [hojaRegistroId(h)],
        horas,
        label: `${h.fecha} · ${h.actividad}`,
        empleado: h.solicitante,
      };
    }
    const mismaActividad = picked.every((h) => h.actividad === picked[0]?.actividad);
    return {
      registroIds: picked.map(hojaRegistroId),
      horas,
      label: mismaActividad
        ? `${picked[0].actividad} · ${picked.length} registros`
        : `${picked.length} registros`,
      empleado: "Varios",
    };
  };

  const confirmarDecision = async (
    keys: string[],
    decision: "aprobado" | "rechazado",
    comentario?: string,
  ) => {
    const resolved = resolverTargets(keys);
    if (!resolved.registroIds.length) {
      toast("Esa selección ya no tiene horas pendientes.", "warn");
      clearSeleccion();
      await cargar();
      return;
    }

    const result = await resolverAprobacionTiempoAction({
      registroIds: resolved.registroIds,
      decision,
      comentario,
    });
    if (!result.ok) {
      if (result.stale) {
        toast(
          "Algún registro ya no está pendiente en IFS. Actualizamos el resumen.",
          "warn",
        );
        await cargar();
        clearSeleccion();
        return;
      }
      toast(result.error || "No se pudo registrar la decisión.", "danger");
      return;
    }

    const horasLabelTxt = formatHorasValor(resolved.horas);
    toast(
      decision === "aprobado"
        ? `${resolved.label} · ${horasLabelTxt}h aprobadas`
        : `${resolved.label} · ${horasLabelTxt}h rechazadas`,
      decision === "aprobado" ? "green" : "danger",
    );
    clearSeleccion();
    await cargar();
  };

  const confirmarAnulacion = async () => {
    const picked = hojasRes.filter((h) =>
      anularTargets.includes(hojaRegistroId(h)),
    );
    const registroIds = picked
      .map((h) => h.registroId || hojaRegistroId(h))
      .filter(Boolean);
    if (!registroIds.length) {
      toast("Ese registro ya no está resuelto.", "warn");
      setAnularTargets([]);
      await cargar();
      return;
    }

    const result = await resolverAprobacionTiempoAction({
      registroIds,
      decision: "anulado",
    });
    if (!result.ok) {
      toast(result.error || "No se pudo anular la decisión.", "danger");
      return;
    }

    void createNotificacionesTiempoDecisionAction({
      decision: "anulado",
      hojas: picked.map(toHojaNotifInput),
    }).catch((error) => {
      console.error("[notificaciones] no se pudo notificar anulación", error);
    });

    toast(toastAnulados(picked.map((h) => h.no)), "green");
    setAnularTargets([]);
    await cargar();
  };

  const anularResolved = (() => {
    const picked = hojasRes.filter((h) =>
      anularTargets.includes(hojaRegistroId(h)),
    );
    const horas = roundHoras(
      picked.reduce((s, h) => s + horasNum(h.horas), 0),
    );
    if (picked.length === 1) {
      const h = picked[0];
      return {
        label: `${h.fecha} · ${h.actividad}`,
        horas,
      };
    }
    return {
      label: `${picked.length} registros`,
      horas,
    };
  })();

  const aprobarResolved = resolverTargets(aprobarTargets);
  const rechazarResolved = resolverTargets(rechazarTargets);

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-[#111]">Aprobar Tiempo</h1>
          <IfsConnectedChip
            surface="approval"
            connected={ifsConnected}
            fromIfs={fromIfs}
            warning={ifsWarning}
          />
        </div>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Elige un proyecto y resuelve sus horas.
        </p>
        <div className="mt-3">
          <IfsStatusBanner
            surface="approval"
            loginNext="/aprobacion-tiempo-proyectos"
            connected={ifsConnected}
            fromIfs={fromIfs}
            email={ifsEmail}
            warning={ifsWarning}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={kpis.pendientes}
          sub="Requieren acción"
          alert
        />
        <KpiCard
          label="Aprobadas este mes"
          value={kpis.aprobadas}
          sub={`${formatHorasValor(kpis.horasAprobadas)} h aprobadas`}
          navy
        />
        <KpiCard
          label="Rechazadas"
          value={kpis.rechazadas}
          sub="Este mes"
        />
        <KpiCard
          label="Horas por aprobar"
          value={formatHorasValor(kpis.horasPendientes)}
          sub="En registros pendientes"
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="lg:sticky lg:top-[72px] lg:w-[260px] lg:shrink-0 lg:self-start">
          <AprobacionProyectosLista
            proyectos={proyectos}
            selectedCodigo={proyectoSeleccionado}
            onSelect={seleccionarProyecto}
            loaded={loaded}
          />
        </aside>

        <section className="min-w-0 flex-1">
          {proyectoActual ? (
            <div className="bg-[#f5f7fa] lg:sticky lg:top-[72px] lg:z-20">
              <AprobacionFilterBar
                key={`${proyectoSeleccionado}-${tab}`}
                hideColumns={["proyecto"]}
                registros={hojasTabBase}
                filters={filters}
                onChange={setFilters}
                tab={tab}
                actions={
                  tab === "pend" ? (
                    <BulkActionButtons
                      onAprobar={solicitarAprobacionTabla}
                      onRechazar={solicitarRechazoTabla}
                    />
                  ) : undefined
                }
              />
            </div>
          ) : null}

          <Card className="mb-0 overflow-hidden p-0">
            {proyectoActual ? (
              <div className="flex items-center justify-between gap-3 border-b-2 border-[#e5e9f0] px-2">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => handleTab("pend")}
                    className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
                      tab === "pend"
                        ? "border-b-navy font-bold text-navy"
                        : "border-b-transparent font-medium text-muted hover:text-navy"
                    }`}
                  >
                    <Icon name="clock" size="sm" />
                    Por aprobar
                    <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
                      {tabCounts.pend}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTab("res")}
                    className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
                      tab === "res"
                        ? "border-b-navy font-bold text-navy"
                        : "border-b-transparent font-medium text-muted hover:text-navy"
                    }`}
                  >
                    <Icon name="checkSquare" size="sm" />
                    Resueltas
                    <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
                      {tabCounts.res}
                    </span>
                  </button>
                </div>
                <div className="flex items-baseline gap-2.5 pr-3">
                  {filtrosActivos ? (
                    <span className="text-[12px] tabular-nums text-muted">
                      {hojasTab.length} de {hojasTabBase.length}
                    </span>
                  ) : null}
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Horas
                  </span>
                  <span className="text-[18px] font-extrabold tabular-nums text-navy">
                    {formatHorasValor(
                      hojasTab.reduce((s, h) => s + horasNum(h.horas), 0),
                    )}
                  </span>
                </div>
              </div>
            ) : null}

            {!proyectoActual ? (
              <div className="px-5 py-16 text-center text-[13px] text-muted">
                <Icon
                  name="folderOpen"
                  size="xl"
                  className="mx-auto mb-2 opacity-30"
                />
                Selecciona un proyecto para ver y resolver sus horas.
              </div>
            ) : (
              <AprobacionProyectosRegistrosTabla
                tab={tab}
                registros={hojasTab}
                totalBase={hojasTabBase.length}
                hasFilters={filtrosActivos}
                loaded={loaded}
                seleccion={seleccion}
                onToggle={toggleSeleccion}
                onToggleLote={toggleSeleccionLote}
                onAnular={(id) => setAnularTargets([id])}
              />
            )}
          </Card>
        </section>
      </div>

      <AprobarModal
        open={aprobarTargets.length > 0}
        registroLabel={aprobarResolved.label}
        empleado={aprobarResolved.empleado || "Empleado"}
        horas={formatHorasValor(aprobarResolved.horas)}
        onClose={() => setAprobarTargets([])}
        onConfirm={async () => {
          const targets = [...aprobarTargets];
          await confirmarDecision(targets, "aprobado");
          setAprobarTargets([]);
        }}
      />
      <RechazarModal
        open={rechazarTargets.length > 0}
        resumen={rechazarResolved.label}
        onClose={() => setRechazarTargets([])}
        onConfirm={async (motivo) => {
          const targets = [...rechazarTargets];
          await confirmarDecision(targets, "rechazado", motivo);
          setRechazarTargets([]);
        }}
      />
      <AnularModal
        open={anularTargets.length > 0}
        registroLabel={anularResolved.label}
        horas={formatHorasValor(anularResolved.horas)}
        onClose={() => setAnularTargets([])}
        onConfirm={confirmarAnulacion}
      />
    </div>
  );
}
