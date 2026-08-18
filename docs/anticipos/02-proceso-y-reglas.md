# 2. Proceso y Reglas

Fuente Notion. De aquí salen los tickets de desarrollo.

---

# Flujo Completo

De punta a punta — desde que el empleado crea la solicitud hasta que queda lista para legalizar.

| Paso | Actor | Resultado |
| --- | --- | --- |
| Empleado crea y envía la solicitud | Empleado | Nace la solicitud en estado **Lanzado** |
| Aprobador revisa | Aprobador | Aprueba o Rechaza |
| IFS procesa el pago | IFS / Tesorería | Estado pasa a **Pagado** |
| Solicitud queda lista para legalizar | — | Flujo completo |

El formulario **no tiene estado**: la solicitud nace al enviar, no al guardar.

---

# Estados y Transiciones

Cada acción es una transición. El formulario no tiene estado — la solicitud nace al enviar.

| Acción | Quién | Transición | Regla | Estado Factura IFS |
| --- | --- | --- | --- | --- |
| **Enviar** | Empleado | formulario → Lanzado | La solicitud nace al enviar | — |
| **Cancelar** | Empleado | Lanzado → Cancelado | Solo mientras el aprobador no actúa | — |
| **Aprobar** | Aprobador | Lanzado → Aprobado | Lista para pago | `CONTAB_AUTH` |
| **Rechazar** | Aprobador | Lanzado → Rechazado | Final. El empleado debe crear una nueva solicitud. | — |
| **Pagar** | Tesorería · IFS | Aprobado → Pagado | Fecha de pago automática desde IFS | `PAID_POSTED` |

Cancelado, Rechazado y Pagado son **finales** — no se reabren.

---

# Para quién es el anticipo — dos modos

Al inicio del formulario ("Solicitud para") el empleado elige **Para mí** o **Para otro empleado**. El flujo de estados es idéntico en ambos; lo que cambia es **de quién es la solicitud** y **qué datos llenan el formulario**.

**Para mí** (por defecto)

- Tus datos (cédula, cuenta, banco) salen precargados y bloqueados.
- Eliges compañía + proyecto.
- Al enviar, la solicitud cae en **tu** lista "Mis anticipos".

**Para otro empleado**

- Tú figuras como quien registra ("Registrado por"), pero el anticipo pertenece al **beneficiario** — el dinero se acredita a **su** cuenta.
- Orden en cascada: **compañía → proyecto → empleado**. El selector de empleado solo aparece cuando ya hay compañía y proyecto; entonces se autocompletan (solo lectura) la cuenta y el banco del beneficiario.

**R-01:** una solicitud registrada para otro empleado **no** aparece en "Mis anticipos" ni en el histórico de quien la registra — cae en el perfil y el histórico del **beneficiario**. El registrante solo la creó.

---

# Regla de Cancelación

Cancelado tiene **dos orígenes**:

1. **Lo canceló el empleado** — desde el portal en estado Lanzado, antes de que se apruebe y exista factura.
2. **Se canceló desde el sistema** — cancelación en IFS después de aprobar. Si Tesorería cancela la factura y por ende el pago del anticipo relacionado.

Mismo estado final en ambos casos. En el histórico de actividad del anticipo se indica cuál de los dos sucedió.

Para la cancelación desde el sistema, el histórico muestra **quién** la canceló y la **fecha** (el portal lo lee del registro de IFS). IFS no notifica al portal de forma literal: la cancelación solo queda como entrada en ese histórico.

---

# Estados de Factura IFS vs. Solicitud

Solo las solicitudes que se van a pagar generan factura. Si la solicitud no se paga (Cancelada o Rechazada en Lanzado), no hay factura que rastrear.

| Estado Factura IFS | Cuándo | Estado Solicitud |
| --- | --- | --- |
| `Contab. Autoriz.` | Se contabiliza la factura y se autoriza para pago | **Aprobado** |
| `Pagada Contab.` | Pagada completamente (importe pendiente = 0) | **Pagado** — disponible para legalizar |
| Factura cancelada en IFS | Una factura ya aprobada se cancela en IFS fuera del control del empleado | **Cancelado** — "Cancelado desde el sistema" |

**Retención:** los anticipos a empleados **no** están sujetos a retención. Cuando una factura lleva retención, IFS la pasa a *Pagada Parcialmente* — en anticipos de empleado ese estado no debería presentarse.

---

# Restricciones

- **Viaje:** no se puede solicitar para el mismo día — requiere anticipación. **Gasto:** se puede registrar el mismo día.
- El número de solicitud del portal (`AG####` / `AV####`) se mapea al campo `PaymentReference` de la factura en IFS — así se rastrea de un sistema al otro.
- De IFS solo regresan al portal: el **estado**, la **fecha de pago** y la **actividad** en el histórico. Ningún otro campo (montos, etc.) se sincroniza de regreso.
- Al rechazar, el motivo es **requerido** (10–200 caracteres). La solicitud rechazada no se edita ni se reenvía.
