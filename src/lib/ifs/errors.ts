export class IfsApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "IfsApiError";
    this.status = status;
    this.body = body;
  }
}

export function assertIfsOk(res: Response, body: string): void {
  if (res.ok) return;
  throw new IfsApiError(
    `IFS API ${res.status} ${res.statusText}`,
    res.status,
    body,
  );
}

export function formatIfsError(err: unknown): string {
  if (err instanceof IfsApiError) {
    if (err.status === 401) {
      const isHtml = err.body.trim().startsWith("<!");
      if (isHtml) {
        return "401 Unauthorized — sesión IFS expirada o token inválido. Vuelve a iniciar sesión.";
      }
    }
    if (/ORA-06531|uninitialized collection/i.test(err.body)) {
      return "IFS no pudo generar la factura al aprobar (ORA-06531). La solicitud sí está en Employee Advances. Revisar en IFS: serie AG/AV, Prepayment Type y vínculo empleado–proveedor (HMV-110).";
    }
    const detail = err.body.replace(/\s+/g, " ").trim().slice(0, 240);
    return detail ? `${err.message} — ${detail}` : err.message;
  }
  return err instanceof Error ? err.message : "Error IFS desconocido";
}
