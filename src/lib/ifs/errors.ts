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
