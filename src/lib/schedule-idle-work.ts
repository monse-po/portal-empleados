/** Corre cuando el browser está libre, para no pelear con la carga del home. */
export function scheduleIdleWork(fn: () => void, timeoutMs = 2000): () => void {
  if (typeof window === "undefined") return () => {};

  const ric = window.requestIdleCallback?.bind(window);
  if (typeof ric === "function") {
    const id = ric(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(fn, 250);
  return () => window.clearTimeout(id);
}
