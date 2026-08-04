import { getUserInfo, openCempPortalSession } from "@/src/lib/ifs/cemp-portal";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import {
  displayNameFromEmail,
  empleadoDbIdFromEmail,
  type PortalUserProfile,
  type TiempoEmpleadoContext,
} from "@/src/lib/portal-user-profile";

const DEMO_EMPLEADO_DB_ID = SESSION_EMPLEADO.cedula.replace(/\./g, "");

const DEMO_PROFILE: PortalUserProfile = {
  email: "carlos.rivas@hmvingenieros.com",
  name: SESSION_EMPLEADO.nombre,
  companyId: SESSION_EMPLEADO.companiaDefault,
  empleadoDbId: DEMO_EMPLEADO_DB_ID,
  source: "demo",
};

function resolveEmpleadoDbId(input: {
  ifsEmpId?: string;
  empNo?: string;
  email: string;
}): string {
  const ifsEmpId = input.ifsEmpId?.trim();
  if (ifsEmpId) return ifsEmpId;
  const empNo = input.empNo?.trim();
  if (empNo) return empNo;
  return empleadoDbIdFromEmail(input.email);
}

function profileFromSession(
  email: string,
  name?: string,
  companyId?: string,
): PortalUserProfile {
  return {
    email,
    name: name?.trim() || displayNameFromEmail(email),
    companyId,
    empleadoDbId: resolveEmpleadoDbId({ email }),
    source: "ifs",
  };
}

export async function getPortalUserProfile(): Promise<PortalUserProfile | null> {
  const session = await getServerIfsSession();
  if (!session) {
    return isIfsAuthEnabled() ? null : DEMO_PROFILE;
  }

  try {
    return await withValidIfsSession(async (liveSession) => {
      const ifs = await openCempPortalSession(
        liveSession.email,
        liveSession.accessToken,
      );
      const info = await getUserInfo(ifs);
      return {
        email: liveSession.email,
        name:
          info.EmpName?.trim() ||
          liveSession.name?.trim() ||
          displayNameFromEmail(liveSession.email),
        companyId: info.CompanyId ?? ifs.user.CompanyId,
        companyName: info.CompanyName,
        empNo: info.EmpNo,
        ifsEmpId: ifs.user.EmpId,
        empleadoDbId: resolveEmpleadoDbId({
          ifsEmpId: ifs.user.EmpId,
          empNo: info.EmpNo,
          email: liveSession.email,
        }),
        source: "ifs",
      };
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) return null;
    return profileFromSession(
      session.email,
      session.name,
    );
  }
}

/** Empleado activo para lectura/escritura de Mi Tiempo en Prisma. */
export async function getTiempoEmpleadoContext(): Promise<TiempoEmpleadoContext | null> {
  const profile = await getPortalUserProfile();
  if (!profile) return null;
  return {
    empleadoId: profile.empleadoDbId,
    empleadoDbId: profile.empleadoDbId,
    name: profile.name,
    email: profile.email,
    source: profile.source,
  };
}
