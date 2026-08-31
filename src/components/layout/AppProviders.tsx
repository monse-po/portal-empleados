"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  AprobacionAnticiposProvider,
  useAprobacionAnticipos,
} from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import {
  AprobacionLegalizacionesProvider,
} from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import {
  AprobacionProvider,
  useAprobacion,
} from "@/src/app/aprobacion-tiempo/AprobacionContext";
import {
  AnticiposProvider,
  useAnticipos,
} from "@/src/app/mis-anticipos/AnticiposContext";
import { DocumentoSoporteProvider } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import {
  MiTiempoProvider,
  useMiTiempo,
} from "@/src/app/hoja-tiempo/MiTiempoContext";
import { NotificationProvider } from "@/src/components/notifications/NotificationContext";
import { anticipoToAprobacion } from "@/src/lib/anticipos-bridge";
import type { SyncAnticipoHandler } from "@/src/lib/anticipos-bridge";
import type { SyncRegistroHandler } from "@/src/lib/tiempo-bridge";
import { getFocusModules } from "@/src/lib/modules";

function MiTiempoBridge({
  children,
  syncRef,
}: {
  children: ReactNode;
  syncRef: React.MutableRefObject<SyncRegistroHandler | undefined>;
}) {
  const { ingresarHojas, retirarHojas } = useAprobacion();

  return (
    <MiTiempoProvider
      onIngresarHojas={ingresarHojas}
      onRetirarHojas={retirarHojas}
    >
      <RegistroSyncEffect syncRef={syncRef} />
      {children}
    </MiTiempoProvider>
  );
}

function RegistroSyncEffect({
  syncRef,
}: {
  syncRef: React.MutableRefObject<SyncRegistroHandler | undefined>;
}) {
  const { sincronizarDesdeAprobacion } = useMiTiempo();

  useEffect(() => {
    syncRef.current = (registroId, accion, comentario) => {
      sincronizarDesdeAprobacion(registroId, accion, comentario);
    };
    return () => {
      syncRef.current = undefined;
    };
  }, [sincronizarDesdeAprobacion, syncRef]);

  return null;
}

function AnticiposBridge({
  children,
  syncRef,
}: {
  children: ReactNode;
  syncRef: React.MutableRefObject<SyncAnticipoHandler | undefined>;
}) {
  const { ingresarSolicitud, retirarSolicitud } = useAprobacionAnticipos();

  return (
    <AnticiposProvider
      onIngresarSolicitud={ingresarSolicitud}
      onRetirarSolicitud={retirarSolicitud}
    >
      <AnticipoSyncEffect syncRef={syncRef} />
      <AnticipoSeedHydration />
      {children}
    </AnticiposProvider>
  );
}

function AnticipoSyncEffect({
  syncRef,
}: {
  syncRef: React.MutableRefObject<SyncAnticipoHandler | undefined>;
}) {
  const { sincronizarDesdeAprobacion } = useAnticipos();

  useEffect(() => {
    syncRef.current = (no, accion, comentario) => {
      sincronizarDesdeAprobacion(no, accion, comentario);
    };
    return () => {
      syncRef.current = undefined;
    };
  }, [sincronizarDesdeAprobacion, syncRef]);

  return null;
}

/** Inyecta anticipos Lanzado del empleado en la cola del gerente. */
function AnticipoSeedHydration() {
  const { anticipos, extras, loaded, fromIfs: fromIfsEmp } = useAnticipos();
  const { ingresarSolicitud, fromIfs: fromIfsApro } = useAprobacionAnticipos();
  const hydrated = useRef(new Set<string>());

  useEffect(() => {
    if (!loaded) return;
    if (fromIfsEmp || fromIfsApro) return;
    Object.values(anticipos)
      .filter((a) => a.estado === "Lanzado")
      .forEach((a) => {
        if (hydrated.current.has(a.no)) return;
        hydrated.current.add(a.no);
        ingresarSolicitud(anticipoToAprobacion(a, extras[a.no]));
      });
  }, [anticipos, extras, fromIfsApro, fromIfsEmp, ingresarSolicitud, loaded]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const syncRef = useRef<SyncRegistroHandler | undefined>(undefined);
  const anticiposSyncRef = useRef<SyncAnticipoHandler | undefined>(undefined);

  const onSyncRegistro = useCallback<SyncRegistroHandler>(
    (registroId, accion, comentario) => {
      syncRef.current?.(registroId, accion, comentario);
    },
    [],
  );

  const onSyncAnticipo = useCallback<SyncAnticipoHandler>(
    (no, accion, comentario) => {
      anticiposSyncRef.current?.(no, accion, comentario);
    },
    [],
  );

  const focus = getFocusModules();
  const tiempoOnly = focus?.length === 1 && focus[0] === "tiempo";
  const tiempoTree = (
    <NotificationProvider>
      <AprobacionProvider onSyncRegistro={onSyncRegistro}>
        <MiTiempoBridge syncRef={syncRef}>{children}</MiTiempoBridge>
      </AprobacionProvider>
    </NotificationProvider>
  );

  if (tiempoOnly) return tiempoTree;

  return (
    <NotificationProvider>
      <AprobacionProvider onSyncRegistro={onSyncRegistro}>
        <AprobacionAnticiposProvider onSyncAnticipo={onSyncAnticipo}>
          <AprobacionLegalizacionesProvider>
            <DocumentoSoporteProvider>
              <AnticiposBridge syncRef={anticiposSyncRef}>
                <MiTiempoBridge syncRef={syncRef}>{children}</MiTiempoBridge>
              </AnticiposBridge>
            </DocumentoSoporteProvider>
          </AprobacionLegalizacionesProvider>
        </AprobacionAnticiposProvider>
      </AprobacionProvider>
    </NotificationProvider>
  );
}
