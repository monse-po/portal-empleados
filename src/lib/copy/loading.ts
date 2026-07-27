import type { IconName } from "@/src/components/ui/Icon";

export type LoadingCopyEntry = {
  label: string;
  icon: IconName;
  hint?: string;
};

/** Textos e iconos de estados de carga — una sola fuente de verdad. */
export const LOADING_COPY = {
  catalogIfs: {
    label: "Cargando catálogo IFS",
    icon: "folderOpen",
  },
  projects: {
    label: "Cargando proyectos",
    icon: "folderOpen",
  },
  approver: {
    label: "Cargando aprobador",
    icon: "userCircle",
  },
  hourTypes: {
    label: "Cargando tipos de hora",
    icon: "clock",
  },
  timeRecords: {
    label: "Cargando registros de tiempo",
    icon: "clock",
    hint: "Conectando con la base de datos",
  },
  timeRecordsIfs: {
    label: "Cargando registros de tiempo",
    icon: "clock",
    hint: "Consultando hoja de tiempo en IFS",
  },
  notifications: {
    label: "Cargando notificaciones",
    icon: "bell",
  },
  generic: {
    label: "Cargando",
    icon: "hourglass",
  },
} as const satisfies Record<string, LoadingCopyEntry>;

export function loadingPlaceholder(entry: LoadingCopyEntry): string {
  return `${entry.label}…`;
}
