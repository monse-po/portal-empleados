# 3. Integración IFS

Fuente Notion. Equipo: Venkatesh (APEX/frontend) y Anshul (IFS backend).

El portal **no inventa** el anticipo: lo crea y lo lee en **Employee Advances**. `CEmpPortalServices` solo alimenta catálogos del formulario.

---

# Esquema Empleado–Proveedor (cross-company)

IFS paga **solo a través del módulo de Proveedores**. Para pagarle a una persona, esa persona debe existir como **Proveedor**. En IFS, Empleado y Proveedor son **registros independientes** que se vinculan.

El sistema distingue **empleado** de **proveedor** mediante un **vínculo explícito Proveedor–Empleado**:

- Checkbox **Employee Group** en la ficha de Proveedor (default `FALSE`).
- Pestaña **Empleado** que vincula `Supplier_id ↔ Employee_id` (relación 1:1).
- Con `Employee Group = TRUE` (hay vínculo) la solicitud procesa como **Empleado**; sin vínculo, procesa como **Proveedor**.

Este vínculo **reemplaza** el esquema anterior basado en `Supplier Group = 'EMP'`.

La **misma persona** cambia de esquema según la compañía donde se genera el anticipo:

| Compañía | La persona existe como | Esquema | Prepayment Type | Tipo de Carga / Factura |
| --- | --- | --- | --- | --- |
| Propia | Empleado + Proveedor (vinculado) | **Empleado** | `ANTE001` | `EMPADVR` |
| Hermana | Solo Proveedor (sin vínculo) | **Proveedor** | `ANTP001` | `SUPPIADV` |

El selector de **Compañía** muestra todas las compañías donde el usuario tiene registro **activo como Proveedor**. La solicitud queda asociada a la compañía seleccionada.

El checkbox y la pestaña en IFS son **configuración de IFS** (ticket HMV-110, César/Anshul), no del portal. El portal solo consume el resultado.

---

# Ventanas en IFS

## Series de Factura — Global Invoice Series

**Ventana:** `Global Invoice Series`

**Ruta:** `Financials → Supplier Invoice → Basic Data → Global Invoice Series`

Las series están configuradas como **globales** — un único consecutivo compartido entre todas las compañías de HMV.

| Serie | Tipo de anticipo | Valor inicial |
| --- | --- | --- |
| `AG` | Anticipo de Gasto | 23,000 |
| `AV` | Anticipo de Viaje | 50,000 |

## Employee Advances

**Ventana:** `Employee Advances`

**Ruta:** `Financials → Accounts Payable → Employee Advances`

La ventana deberá incluir como columnas todos los campos definidos en Campos y Mapeo.

Catálogos que hoy sí expone `CEmpPortalServices` (formulario): `CompanySet`, `GetEmployees`, `GetProjects`, `GetBankDetails`, `GetCurrencyCodes`, `GetExpenseCompany`.

CRUD de solicitudes: proyección **`CEmpAdvanceHandling`** (`/main/.../CEmpAdvanceHandling.svc`).

| Flujo | Operación |
| --- | --- |
| Crear | `POST /CEmpAdvancesSet` → `RequestNo` |
| Lista empleado | `GET /GetYourRequests(PersonId='…')` |
| Cola aprobador | `GET /GetRequestsForApproval(PersonId='…')` |
| Cancelar | `…/CEmpAdvancesSet(...)/…_Cancel` (`If-Match`) |
| Aprobar | `…_SetApproved` (`Approver`, `ApproverComment`) |
| Rechazar | `…_SetReject` (`Approver`, `ApproverComment`) |

Estados IFS: `Released` / `Approved` / `Rejected` / `Cancelled`. **Pagado** se lee de la factura (`PaymentStatus` / `InvState` = `PAID_POSTED`). Neon no es fuente de verdad.

---

# Campos del Formulario y Mapeo a IFS

| Campo (UI) | Vista / Tabla IFS | Campo IFS | Cuándo se llena | Notas |
| --- | --- | --- | --- | --- |
| Compañía | `Employee Advances` | `Company` | Selección | Compañías donde es Proveedor activo. Cross-company disponible. |
| Código | `Employee Advances` | `Request No` | Automático (portal) | Prefijos `AG####` / `AV####`. Se hereda a `Payment Reference`. |
| Fecha solicitud | `Employee Advances` | `Request Date` | Automático (portal) | Día en curso. No modificable. |
| Solicitado por | `Employee Advances` | `Requester` | Automático (portal) | Quien crea la solicitud (de la sesión). Puede ser distinto al beneficiario. |
| Estado | `Employee Advances` | `Request State` · `Invoice Status` | Derivado | IFS tiene dos campos; el portal los proyecta a 1 de los 5 estados. |
| Proyecto | `Employee Advances` | `Project Id` | Selección | Solo proyectos activos de la compañía. |
| Cédula | `Employee Advances` | `Emp No` | Selección | El beneficiario. En modo "a nombre de otro", es la persona seleccionada. |
| Nombre | `Employee Advances` | `Employee Name` | Automático (IFS) | Se autollena al elegir la Cédula. |
| Cuenta | `PAYMENT_ADDRESS` | `Account` | Automático (IFS) | Del maestro de proveedor del beneficiario. |
| Banco | `PAYMENT_ADDRESS` | `Data2` | Automático (IFS) | Del maestro de proveedor del beneficiario. |
| Tipo de cuenta | `PAYMENT_ADDRESS` | `Data18` | Automático (IFS) | `2` = Corriente / `3` = Ahorro. |
| Tipo | `Employee Advances` | `Request Type` | Selección | Gasto (`Expenses`) / Viaje. |
| Fecha salida | `Employee Advances` | `Departure Date` | Captura | Solo cuando `Tipo = Viaje`. |
| Fecha regreso | `Employee Advances` | `Return Date` | Captura | Solo cuando `Tipo = Viaje`. |
| Destino | `Employee Advances` | `Destination` | Selección (cascada) | País → Departamento → Ciudad. Solo Viaje. |
| Divisa | `Employee Advances` | `Currency Code` | Selección | Divisas de la compañía. |
| Monto solicitado | `Employee Advances` | `Amount` | Captura | Formato de moneda. |
| Motivo | `Employee Advances` | `Description` | Captura | Viaja como `HeaderDocText` a la cabecera del documento contable. |
| Aprobado por | `Employee Advances` | `Approver` | Al aprobar | Dinámico: `Manager` del proyecto o `ResponsiblePersonId`. |
| Fecha de aprobación | `Employee Advances` | `Approved Date` | Al aprobar | Solo cuando se aprueba. |
| Comentario del aprobador | `Employee Advances` | `ApproverComment` | Al aprobar / rechazar | Opcional al aprobar, **requerido al rechazar** (10–200 caracteres). |
| Fecha de pago | Vistas de pago IFS | — | Al pagar | Se lee de IFS cuando `Invoice Status = Pagada Contab.` No se captura en el portal. |

## Campos Backend (no visibles en la UI)

| Campo IFS | Tabla IFS | Cuándo | Notas |
| --- | --- | --- | --- |
| `Invoice Id` | `Employee Advances` | Al aprobar | Id de la factura generada al aprobar. |
| `Invoice No` | `Employee Advances` | Al aprobar | No. de factura. |
| `Invoice Date` | `Employee Advances` | Al aprobar | Fecha de factura. |
| `Payment Reference` | Factura | Al aprobar | Hereda el Código de solicitud — rastrea portal ↔ IFS. |
| `Prepayment Type` | `Employee Advances` | Automático | Empleado `ANTE001` · Proveedor `ANTP001`. |
| `Invoice Type` | `Employee Advances` | Automático | Empleado `EMPADVR` · Proveedor `SUPPIADV`. |
| `Series Id` | `Employee Advances` | Al aprobar | Serie `AG` / `AV`. |

---

# Selectores y Catálogos

| Selector | Vista IFS | Regla | Filtro |
| --- | --- | --- | --- |
| Compañía | — | Cross-company disponible | Compañías donde el usuario tiene registro activo como Proveedor (HMV-110) |
| Proyecto | `PROJECTS` | — | `STATUS = 'ACTIVO'` y `COMPANY = compañía seleccionada` |
| Empleado / Cédula | Proveedores con vínculo Proveedor–Empleado | Beneficiario con `Employee Group = TRUE` en la compañía seleccionada | Reemplaza el viejo `GRUPO='EMP'` (HMV-110) |
| Divisa | `CURRENCY_CODE` | — | Solo divisas de la misma compañía |
| Destino | `ISO_COUNTRY_DEF` · `COUNTY_CODE` · `CITY_CODE` | Selector jerárquico | Solo aplica cuando `Tipo = Viaje` |

**Restricción de visibilidad cross-company:** el selector de empleados solo muestra personas de la compañía en la que el usuario logueado está registrado como `Persona` en IFS. Si no tiene registro en una compañía determinada, los empleados de esa compañía no son visibles — independientemente de sus permisos de acceso al portal.

## Sincronización de regreso (portal)

Solo se leen de IFS: **estado** (Request State + Invoice Status → 5 estados UI), **fecha de pago**, **actividad** del histórico. Montos y demás campos del formulario no se pisan desde IFS.
