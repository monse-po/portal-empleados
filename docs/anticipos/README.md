# Anticipos — fuente de verdad

Export Notion (proceso + IFS). Cualquier cambio de negocio o mapeo se hace **aquí**, no en el mock ni en Neon.

1. [02-proceso-y-reglas.md](./02-proceso-y-reglas.md) — flujo, estados, R-01, cancelación, factura IFS, restricciones
2. [03-integracion-ifs.md](./03-integracion-ifs.md) — Employee Advances, empleado↔proveedor, campos, catálogos

Regla operativa del agente: `.cursor/rules/30-anticipos-business.mdc`

## Dónde vive en IFS

La solicitud **no** es un registro de `CEmpPortalServices`. Esa proyección solo da catálogos (compañías, empleados, proyectos, banco, divisas).

El módulo de negocio es **Employee Advances**:

`Financials → Accounts Payable → Employee Advances`

El portal captura y muestra; IFS genera factura al aprobar (`CONTAB_AUTH`) y marca **Pagado** cuando la factura queda `PAID_POSTED`. Neon, si existe, no es fuente de verdad.

## Código portal vs spec

Si el UI o Neon contradicen estos docs, **ganan los docs**. Huecos conocidos al guardar esta referencia:

| Spec | Portal hoy |
|------|------------|
| R-01: "Para otro" solo en lista/histórico del **beneficiario** | También la ve quien registró |
| Aprobar → **Aprobado**; Pagado lo pone Tesorería/IFS | Aprobar salta a Pagado (mock tesorería) |
| Viaje: no el mismo día | Ida ≥ hoy (copy 2 días hábiles, no bloquea) |
| Destino: País → Depto → Ciudad (ISO IFS) | Destinos mock |
| Compañía = proveedor activo (HMV-110) | Catálogo `CompanySet` / `GetExpenseCompany` |
| Crear/listar/aprobar en Employee Advances | `CEmpAdvanceHandling` (`CEmpAdvancesSet`, `GetYourRequests`, `SetApproved` / `SetReject`) |
