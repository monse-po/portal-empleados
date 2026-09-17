"use client";

import { useEffect, useRef } from "react";
import { scheduleIdleWork } from "@/src/lib/schedule-idle-work";

/** En la ruta actual, ya. En el resto del portal, cuando el browser esté libre. */
export function useIdleOrEagerEffect(effect: () => void, eager: boolean) {
  const started = useRef(false);
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const start = () => {
      if (started.current) return;
      started.current = true;
      effectRef.current();
    };
    if (eager) {
      start();
      return;
    }
    return scheduleIdleWork(start);
  }, [eager]);
}
