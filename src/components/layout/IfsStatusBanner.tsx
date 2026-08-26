type IfsStatusBannerProps = {
  connected: boolean;
  fromIfs: boolean;
  email?: string | null;
  warning?: string | null;
  surface: "timesheet" | "approval";
  loginNext?: string;
};

function loginHref(
  surface: IfsStatusBannerProps["surface"],
  loginNext?: string,
): string {
  const next =
    loginNext ??
    (surface === "approval" ? "/aprobacion-tiempo" : "/hoja-tiempo");
  return `/api/auth/login?next=${encodeURIComponent(next)}`;
}

export function IfsStatusBanner({
  connected,
  fromIfs,
  email,
  warning,
  surface,
  loginNext,
}: IfsStatusBannerProps) {
  if (connected && fromIfs && !warning) {
    return (
      <p className="mb-2 rounded-lg border border-green-border bg-green-bg px-3 py-1.5 text-[13px] text-[#15803d]">
        <strong>IFS conectado</strong>
        {email ? ` · ${email}` : ""} ·{" "}
        {surface === "approval"
          ? "bandeja GetApprovalTimesheets"
          : "hoja GetEmployeeTimesheet"}
      </p>
    );
  }

  if (connected && warning) {
    return (
      <p className="alert-warn mb-2 px-3 py-1.5 text-[13px]">
        Hay sesión IFS, pero la API falló: {warning}{" "}
        <a href="/dev/ifs" className="font-semibold underline">
          Ver diagnóstico
        </a>
      </p>
    );
  }

  return (
    <p className="alert-warn mb-2 px-3 py-1.5 text-[13px]">
      <strong>Sin sesión IFS.</strong> No se muestran datos de ejemplo. Esta
      pantalla queda vacía a propósito hasta que entre con IFS.{" "}
      <a href={loginHref(surface, loginNext)} className="font-semibold underline">
        Entrar con IFS
      </a>
      {" · "}
      <a href="/dev/ifs" className="font-semibold underline">
        Diagnóstico
      </a>
    </p>
  );
}
