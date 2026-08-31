"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AprobacionAnticiposProvider } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { AprobacionLegalizacionesProvider } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import {
  AprobacionProvider,
  useAprobacion,
} from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { AnticiposProvider } from "@/src/app/mis-anticipos/AnticiposContext";
import { DocumentoSoporteProvider } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import {
  MiTiempoProvider,
  useMiTiempo,
} from "@/src/app/hoja-tiempo/MiTiempoContext";
import { NotificationProvider } from "@/src/components/notifications/NotificationContext";
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

export function AppProviders({ children }: { children: ReactNode }) {
  const syncRef = useRef<SyncRegistroHandler | undefined>(undefined);

  const onSyncRegistro = useCallback<SyncRegistroHandler>(
    (registroId, accion, comentario) => {
      syncRef.current?.(registroId, accion, comentario);
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
        <AprobacionAnticiposProvider>
          <AprobacionLegalizacionesProvider>
            <DocumentoSoporteProvider>
              <AnticiposProvider>
                <MiTiempoBridge syncRef={syncRef}>{children}</MiTiempoBridge>
              </AnticiposProvider>
            </DocumentoSoporteProvider>
          </AprobacionLegalizacionesProvider>
        </AprobacionAnticiposProvider>
      </AprobacionProvider>
    </NotificationProvider>
  );
}
