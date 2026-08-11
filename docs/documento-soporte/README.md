# Documento de Soporte (DSE / NA)

Fuente de verdad de negocio (export Notion):

1. [02-reglas-negocio-y-campos.md](./02-reglas-negocio-y-campos.md) — estados, flujo, validaciones
2. [03-referencia-tecnica.md](./03-referencia-tecnica.md) — campos, IFS, PAC

Regla operativa del agente: `.cursor/rules/33-documento-soporte-business.mdc`

## Alcance portal (Modo A)

El Portal de Empleados captura la **solicitud** y la deja en estado **Lanzado** (UI alineada a Anticipos; en Notion el estado inicial puede figurar como Solicitado).  
Aprobación, factura, series DIAN y envío PAC son Contabilidad / IFS (Modo B).

## Pendientes de negocio

- ¿Impuestos (IVA/RIVA/RFTE/RICA) en solicitud o solo en factura? El portal **no** los pide (Modelo Tributario).
- Anti-duplicado: ¿cross-company (NIF + No. Doc) o incluye Empresa?
