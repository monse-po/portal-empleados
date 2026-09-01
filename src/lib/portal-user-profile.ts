export type PortalUserProfile = {
  email: string;
  name: string;
  companyId?: string;
  companyName?: string;
  empNo?: string;
  ifsEmpId?: string;
  /** Clave en Empleado / RegistroTiempo.empleadoId */
  empleadoDbId: string;
  source: "ifs" | "demo";
  /** Sesión real (operador) cuando hay impersonación UAT. */
  operatorEmail?: string;
  /** True si el portal actúa como otro EmailId vía ?u= / cookie. */
  impersonating?: boolean;
};

export type TiempoEmpleadoContext = Pick<
  PortalUserProfile,
  "empleadoDbId" | "name" | "email" | "source"
> & { empleadoId: string };

/** Id estable para Prisma a partir del correo (fallback si IFS no da EmpId). */
export function empleadoDbIdFromEmail(email: string): string {
  const slug = email
    .trim()
    .toLowerCase()
    .replace(/@.+$/, "")
    .replace(/[^a-z0-9]+/g, "");
  return slug || "empleado";
}

/** Nombre legible cuando IFS no devuelve EmpName. */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function profileSubtitle(profile: PortalUserProfile): string {
  const company = profile.companyId ?? profile.companyName;
  return company ? `${profile.email} · ${company}` : profile.email;
}
