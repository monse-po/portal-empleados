"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AprobacionAnticiposProvider,
} from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import {
  AprobacionProvider,
  useAprobacion,
} from "@/src/app/aprobacion-tiempo/AprobacionContext";
import {
  MiTiempoProvider,
  useMiTiempo,
} from "@/src/app/hoja-tiempo/MiTiempoContext";
import type { SyncRegistroHandler } from "@/src/lib/tiempo-bridge";

function MiTiempoBridge({
  children,
  syncRef,
}: {
  children: ReactNode;
  syncRef: React.MutableRefObject<SyncRegistroHandler | undefined>;
}) {
  const { ingresarHojas } = useAprobacion();

  return (
    <MiTiempoProvider onIngresarHojas={ingresarHojas}>
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

  return (
    <AprobacionProvider
      onSyncRegistro={(registroId, accion, comentario) =>
        syncRef.current?.(registroId, accion, comentario)
      }
    >
      <AprobacionAnticiposProvider>
        <MiTiempoBridge syncRef={syncRef}>{children}</MiTiempoBridge>
      </AprobacionAnticiposProvider>
    </AprobacionProvider>
  );
}
