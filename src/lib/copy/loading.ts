import type { IconName } from "@/src/components/ui/Icon";

export type LoadingCopyEntry = {
  label: string;
  icon: IconName;
  hint?: string;
};

/** Texto único para cualquier carga de datos. */
export const LOADING_LABEL = "Cargando datos…";

/** Iconos (y hints opcionales) de estados de carga — una sola fuente de verdad. */
export const LOADING_COPY = {
  catalogIfs: {
    label: LOADING_LABEL,
    icon: "folderOpen",
  },
  projects: {
    label: LOADING_LABEL,
    icon: "folderOpen",
  },
  approver: {
    label: LOADING_LABEL,
    icon: "userCircle",
  },
  hourTypes: {
    label: LOADING_LABEL,
    icon: "clock",
  },
  timeRecords: {
    label: LOADING_LABEL,
    icon: "clock",
    hint: "Conectando con la base de datos",
  },
  timeRecordsIfs: {
    label: LOADING_LABEL,
    icon: "clock",
    hint: "Consultando hoja de tiempo en IFS",
  },
  notifications: {
    label: LOADING_LABEL,
    icon: "bell",
  },
  generic: {
    label: LOADING_LABEL,
    icon: "hourglass",
  },
} as const satisfies Record<string, LoadingCopyEntry>;

export function loadingPlaceholder(entry: LoadingCopyEntry = LOADING_COPY.generic): string {
  return entry.label;
}
