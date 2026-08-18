"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnticiposDivisaOption, AnticiposIfsProfile } from "@/src/lib/ifs/anticipos-catalog";
import type { EmpleadoAnticipo, LovItem } from "@/src/lib/mis-anticipos-mock";
import {
  fetchAnticiposAprobadorAction,
  fetchAnticiposBankAction,
  fetchAnticiposBootstrapAction,
  fetchAnticiposCurrenciesAction,
  fetchAnticiposEmployeesAction,
  fetchAnticiposProjectsAction,
} from "@/src/server/anticipos-catalog-actions";

export function useAnticiposIfsCatalog() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AnticiposIfsProfile | null>(null);
  const [companies, setCompanies] = useState<LovItem[]>([]);

  const employeesCache = useRef(new Map<string, EmpleadoAnticipo[]>());
  const projectsCache = useRef(new Map<string, LovItem[]>());
  const currenciesCache = useRef(new Map<string, AnticiposDivisaOption[]>());
  const bankCache = useRef(new Map<string, { banco: string; tipo: string; cuenta: string }>());
  const aprobadorCache = useRef(new Map<string, { codigo: string; nombre: string }>());

  useEffect(() => {
    let cancelled = false;
    void fetchAnticiposBootstrapAction().then((result) => {
      if (cancelled) return;
      setConnected(result.connected);
      setProfile(result.profile ?? null);
      setCompanies(result.companies);
      setError(result.error ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEmployees = useCallback(async (companyId: string) => {
    const key = companyId.trim();
    if (!key) return [] as EmpleadoAnticipo[];
    const cached = employeesCache.current.get(key);
    if (cached) return cached;
    const result = await fetchAnticiposEmployeesAction(key);
    employeesCache.current.set(key, result.employees);
    return result.employees;
  }, []);

  const loadProjects = useCallback(async (companyId: string) => {
    const key = companyId.trim();
    if (!key) return [] as LovItem[];
    const cached = projectsCache.current.get(key);
    if (cached) return cached;
    const result = await fetchAnticiposProjectsAction(key);
    projectsCache.current.set(key, result.projects);
    return result.projects;
  }, []);

  const loadCurrencies = useCallback(async (companyId: string) => {
    const key = companyId.trim();
    if (!key) return [] as AnticiposDivisaOption[];
    const cached = currenciesCache.current.get(key);
    if (cached) return cached;
    const result = await fetchAnticiposCurrenciesAction(key);
    currenciesCache.current.set(key, result.currencies);
    return result.currencies;
  }, []);

  const loadBank = useCallback(async (companyId: string, empNo: string) => {
    const key = `${companyId.trim()}::${empNo.trim()}`;
    if (!companyId.trim() || !empNo.trim()) {
      return { banco: "", tipo: "", cuenta: "" };
    }
    const cached = bankCache.current.get(key);
    if (cached) return cached;
    const result = await fetchAnticiposBankAction({ companyId, empNo });
    const bank = {
      banco: result.banco,
      tipo: result.tipo,
      cuenta: result.cuenta,
    };
    bankCache.current.set(key, bank);
    return bank;
  }, []);

  const loadAprobador = useCallback(async (projectId: string) => {
    const key = projectId.trim();
    if (!key) return null;
    const cached = aprobadorCache.current.get(key);
    if (cached) return cached;
    const result = await fetchAnticiposAprobadorAction(key);
    if (!result.codigo && !result.nombre) return null;
    const value = {
      codigo: result.codigo || result.nombre || "",
      nombre: result.nombre || result.codigo || "",
    };
    aprobadorCache.current.set(key, value);
    return value;
  }, []);

  return {
    connected,
    loading,
    error,
    profile,
    companies,
    loadEmployees,
    loadProjects,
    loadCurrencies,
    loadBank,
    loadAprobador,
  };
}
