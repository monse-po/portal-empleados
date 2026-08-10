# 3. Referencia Técnica

> Contiene las customizaciones requeridas en IFS y la especificación de integración con el PAC.
> 

---

# Configuración de Series DSE por Empresa

Nueva ventana en IFS. = Solo visible para empresas con país = CO. El No. DSE (folio) es el número que identifica el documento ante la DIAN — es distinto al No. Factura interno de IFS.

Ruta: Finanzas → Factura Manual de Proveedor → Documento Soporte 

| Campo | Tipo | Editable | Descripción |
| --- | --- | --- | --- |
| Empresa | Texto | No | Solo empresas CO asignadas al usuario. |
| Tipo de Documento | Lista | Sí (Admin) | DSE o NA. |
| No. Resolución DIAN | Texto | Sí (Admin) | Campo DRF_1 del archivo PAC. No aplica para NA. |
| Prefijo | Texto | Sí (Admin) | Puede estar vacío. Campo DRF_4. |
| Número Inicial | Numérico | Sí (Admin) | Campo DRF_5. |
| Número Final | Numérico | Sí (Admin) | Campo DRF_6. |
| Consecutivo Actual🚩 | Numérico | No (Sistema) | Último número asignado. |
| Fecha Inicio Vigencia | Fecha | Sí (Admin) | Campo DRF_2. |
| Fecha Fin Vigencia | Fecha | Sí (Admin) | Campo DRF_3. |
| Estado 🚩 | Lista | No (Sistema) | Vigente / Agotada / Vencida / Cancelada. Calculado automáticamente. |

### **Reglas técnicas de la ventana:**

- Si no existe serie disponible → el sistema bloquea la emisión con mensaje de error.
- Una serie utilizada no puede eliminarse, solo cancelarse.

*(Regla de negocio "solo una serie Vigente por empresa y tipo de documento a la vez": ver Reglas de Negocio y Campos → Vigencia de Series DSE / NA.)*

**Manejo de errores PAC sobre el folio:**

| Situación | Comportamiento |
| --- | --- |
| PAC valida exitosamente | Folio asignado definitivamente. Consecutivo avanza. |
| PAC rechaza el documento | Folio se invalida y no se reutiliza. Se toma el siguiente para el reintento. |

---

# Customizaciones en IFS

# Campos de la Solicitud

| Campo | Tipo | Regla |
| --- | --- | --- |
| Origen Solicitud | Automático | Se determina según el origen del registro (Portal o IFS). |
| Fecha de Solicitud | Automático | Fecha y hora del sistema (SYSDATE). |
| Registrado por | Automático | Empleado que registra la solicitud. |
| Empresa | LOV | Selección obligatoria. |
| Tipo de Documento | LOV | Valores permitidos: DSE o NA. |
| Solicitado Por | LOV | Permite registrar solicitudes para un empleado distinto al capturista. |
| Número de Identificación Fiscal | Texto | Captura manual. No acepta espacios. Es el NIF informado en la solicitud; puede no coincidir con el NIF del proveedor que finalmente se registre en la factura (ver Segunda Parte, Reconciliación). |
| No. Documento Original | Texto | Captura manual. Validación de duplicidad al guardar (ver Reglas de Negocio y Campos → Validación Anti-Duplicados para la combinación exacta de campos que se bloquea). ⚠️ Nota: esta tabla mencionaba antes "Empresa + NIF + No. Documento Original", pero la página de Reglas de Negocio describe la validación como cross-company (sin Empresa en la combinación) — queda pendiente de confirmar cuál es la versión correcta. |
| Fecha Documento | Fecha | Captura manual. |
| Tarjeta Crédito Corporativa | Numérico | Captura manual. Solo se capturan los últimos 4 dígitos de la tarjeta, nunca el número completo. |
| Concepto | Texto | Captura manual. |
| Divisa | LOV | Selección obligatoria. |
| Monto | Numérico | Captura manual, incluyendo el signo. Aplica la regla de signo por Tipo de Documento (ver Reglas de Negocio y Campos → Regla de Signo del Monto). Sin validación de coincidencia contra la factura posterior (ver Reglas de Negocio y Campos → Reconciliación). |
| Adjunto / Evidencia | Archivo | Obligatorio siempre, para todo tipo de solicitud (DSE y NA). |
| No. Solicitud | Automático | Consecutivo único generado al guardar la solicitud, independiente de la empresa. |
| Estado Solicitud | Automático | Valor inicial: Solicitado. |
| Aprobado por | Automático | Empleado que aprueba la solicitud. Puede coincidir con Registrado por, pero no puede coincidir con Solicitado Por (ver regla de autorización en Reglas de Negocio y Campos → Aprobación). |
| Fecha de Aprobación | Automático | Fecha y hora del sistema (SYSDATE). |
| Invoice ID Relacionado | Automático | Se asigna cuando la solicitud aprobada se selecciona en una factura de proveedor (ver Segunda Parte). Una solicitud con este campo lleno no aparece disponible para seleccionarse en otra factura. Se limpia si la factura relacionada se cancela y el Documento Electrónico DS no ha sido aceptado por la DIAN (ver Reglas de Negocio y Campos → Cancelación de Factura). |
| Tipo Ajuste | LOV | Obligatorio para solicitudes tipo NA antes de aprobar. |
| Documento Soporte a Anular | Texto | Obligatorio para solicitudes tipo NA antes de aprobar. Captura manual (no existe validación contra una base de documentos soporte existentes). |
| CUDS Documento Soporte a Anular | Texto | Obligatorio para solicitudes tipo NA antes de aprobar. Captura manual, sin validación referencial. Pendiente de revisión cuando se defina el Anexo A (ver Puntos Pendientes). |
| Nota de Solicitud | Texto | Obligatoria cuando la solicitud es rechazada. |
| IVA | Númerico | Captura manual, incluyendo el signo. Aplica la misma regla de signo por Tipo de Documento que el campo Monto (ver Reglas de Negocio y Campos → Regla de Signo del Monto). Sin validación de coincidencia contra la factura posterior. |
| RIVA | Númerico | Captura manual, incluyendo el signo. Aplica la misma regla de signo por Tipo de Documento que el campo Monto (ver Reglas de Negocio y Campos → Regla de Signo del Monto). Sin validación de coincidencia contra la factura posterior. |
| RFTE | Númerico | Captura manual, incluyendo el signo. Aplica la misma regla de signo por Tipo de Documento que el campo Monto (ver Reglas de Negocio y Campos → Regla de Signo del Monto). Sin validación de coincidencia contra la factura posterior. |
| RICA | Númerico | Captura manual, incluyendo el signo. Aplica la misma regla de signo por Tipo de Documento que el campo Monto (ver Reglas de Negocio y Campos → Regla de Signo del Monto). Sin validación de coincidencia contra la factura posterior. |

---

# Mecanismos de Validación y Flujo en IFS

## Validación Anti-Duplicados

- Modo A: validación en APEX antes de guardar, mediante consulta a endpoint de IFS.
- Modo B: validación en IFS al guardar la Factura Manual Proveedor.
- Mensaje: *"El documento No. [Número] del proveedor [NIT - Nombre] ya se encuentra registrado en la empresa [Nombre Empresa] con la Solicitud DSE No. [X]. No es posible crear una solicitud duplicada."*

*(Regla de negocio: ver Reglas de Negocio y Campos → Validación Anti-Duplicados.)*

## Creación de Factura de Proveedor

- En el encabezado se selecciona mediante LOV el campo **No. Solicitud Documento Soporte**.
- El LOV muestra únicamente solicitudes en estado Aprobado **sin Invoice ID relacionado**. Excluye: Solicitado, Rechazado, Anulado, y Aprobadas ya vinculadas a otra factura.
- Al guardar: se registra el Invoice ID en la solicitud y se habilita pestaña de solo lectura con los datos de la solicitud en la Factura Manual Proveedor.

## Envío de DSE al PAC

- Una vez generado el folio, se habilita el botón **Solicitar DSE**.
- IFS construye el archivo TXT con los datos de la factura contabilizada (incluyendo impuestos) y lo envía a Carvajal.
- El mapeo de los datos enviados en el TXT se documentará en el Anexo B.

## Respuesta del Servicio

- La respuesta del servicio de Carvajal se muestra mediante un mensaje dentro del ERP.

## Cancelación de Factura — campo afectado

- Al limpiar la relación entre factura y solicitud, se limpia el campo **Invoice ID Relacionado** en la solicitud (ver definición arriba en Campos de la Solicitud).

*(Regla de negocio sobre cuándo aplica esta limpieza: ver Reglas de Negocio y Campos → Cancelación de Factura.)*

---

# Integración con PAC (Carvajal)

Archivo de texto plano separado por comas (`,`), codificación UTF-8 sin BOM.

| Tipo | Valor PAC | Descripción |
| --- | --- | --- |
| Documento Soporte | INVOIC | DSE a sujeto no obligado a facturar. |
| Nota de Ajuste | NC | Corrección o anulación de un DSE ya emitido. |

## Segmentos principales del archivo

| Segmento | Nombre | Descripción |
| --- | --- | --- |
| ENC | Encabezado | Tipo de documento, No. DSE, fecha, hora, divisa, ambiente. |
| CUD | Código CUDS | Código único del DSE. El PAC lo recalcula si se genera incorrectamente. |
| EMI | Emisor (Proveedor) | NIT, nombre, dirección, tipo de organización, régimen tributario, código postal, responsabilidad tributaria. |
| ADQ | Adquiriente (Empresa) | NIT, nombre y responsabilidades tributarias de la empresa compradora. |
| TOT | Totales | Valor bruto, base imponible, descuentos, valor total. |
| TIM + IMP | Impuestos totales | Un bloque por tributo. TIM_1=false para IVA; TIM_1=true para retenciones. |
| TDC | Tipo de cambio | Obligatorio cuando divisa ≠ COP. |
| DRF | Resolución DIAN | No. de autorización, vigencia, prefijo y rango de la serie vigente. |
| MEP | Medio de pago | Código del medio de pago y modalidad. |
| ITE + FCB | Líneas | Una línea por ítem. FCB = Fecha Documento del comprobante físico. |
| TII + IIM | Impuestos por línea | Un bloque por tributo por línea. |
| REF + CDN | Referencia y concepto | Solo para NA. REF = CUFE del DSE original; CDN = concepto del ajuste. |

---

# Modelo Tributario

Los impuestos se capturan en la Factura Manual Proveedor mediante mecanismos estándar de IFS. La solicitud y el portal APEX no capturan impuestos.

| Tributo | Tipo PAC | TIM_1 | Código PAC |
| --- | --- | --- | --- |
| IVA Descontable | Impuesto | false | 01 |
| Retención en la Fuente | Retención | true | 06 |
| Retención de IVA (ReteIVA) | Retención | true | 05 |
| Retención de ICA (ReteICA) | Retención | true | 07 |

---

# Consideraciones Técnicas Generales

- Base de datos del ERP: Oracle.
- Fechas automáticas: obtener mediante `SYSDATE`.
- Número de solicitud: consecutivo único global, independiente de la empresa.
- Validaciones de obligatoriedad: ejecutar antes de permitir el cambio de estado a Aprobado, Rechazado o Anulado.