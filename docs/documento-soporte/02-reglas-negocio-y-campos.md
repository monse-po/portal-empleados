# 2. Reglas de Negocio y Campos

---

# Origen de la Solicitud

Las solicitudes DSE y NA pueden generarse desde:

- Portal de Empleados (Modo A).
- Entidad de Solicitudes en IFS Cloud (Modo B o Contabilidad).
    
    Independientemente del origen, **todas las solicitudes se almacenan en la misma entidad dentro de IFS y siguen las mismas reglas de negocio.**
    

<aside>
🧠

**Contenido**

</aside>

---

---

# Maquina de Estados

| Estado | Descripción | Quién lo activa |
| --- | --- | --- |
| Solicitado | Estado inicial al guardar la solicitud. | Sistema |
| Aprobado | Contabilidad verificó y aprobó. Se puede proceder a crear la factura. | Contabilidad |
| Rechazado | Contabilidad rechazó. El flujo termina. Requiere Nota de Solicitud. | Contabilidad |
| Anulado | La solicitud se cancela antes de tener Invoice ID o documento electrónico válido ante la DIAN. | Contabilidad |

> Una solicitud Rechazada o Anulada no se edita ni se reabre. Cualquier corrección implica crear una solicitud nueva.
> 

---

# Flujo de Proceso

## Registro de Solicitud

La solicitud puede ser creada desde el Portal de Empleados o directamente desde el ERP.
Al guardar la solicitud:

- Se asigna automáticamente un número consecutivo de solicitud.
- Se registra la fecha de solicitud.
- Se registra el empleado que crea la solicitud.
- Se establece el estado inicial como Solicitado.

*(Mecanismo de asignación de fecha y consecutivo: ver Referencia Técnica → Consideraciones Técnicas Generales.)*

## Revisión de Solicitud

La solicitud queda disponible para revisión y decisión.
Las opciones posibles son:

- Aprobar.
- Rechazar.

## Rechazo de Solicitud

Si la solicitud se rechaza:

- La captura de Nota de Solicitud es obligatoria.
- El sistema no permite cambiar el estado a Rechazado sin una nota.
- Una vez rechazada, el flujo finaliza. No existe edición ni reenvío de la misma solicitud; cualquier corrección implica crear una solicitud nueva.

## Aprobación de Solicitud

**Regla de autorización (aplica a DSE y NA):**

- El empleado que aprueba **no puede ser el mismo registrado en Solicitado Por**.
- El campo **Registrado** por sí puede coincidir con el **aprobador** (es válido que la misma persona —por ejemplo, del área de Contabilidad— registre y apruebe, siempre que la solicitud sea a nombre de otro empleado).
- Si Aprobado por = Solicitado Por → el sistema bloquea y muestra mensaje de validación.

---

# Regla de Signo del Monto

- El Monto (y los valores de IVA, RIVA, RFTE y RICA) debe capturarse en positivo cuando el Tipo de Documento es DSE, y en negativo cuando es NA.
- El sistema bloquea el guardado de la solicitud si no se cumple esta regla.

*(Detalle de implementación por campo: ver Referencia Técnica → Campos de la Solicitud.)*

---

# Solicitudes Tipo DSE

Para aprobar una solicitud DSE, además de la regla de autorización anterior:

- No existen validaciones adicionales.
- El sistema registra automáticamente Estado = Aprobado, Aprobado por, y Fecha de Aprobación.

*(Mecanismo de registro automático: ver Referencia Técnica → Campos de la Solicitud.)*

---

# Solicitudes Tipo NA

Para aprobar una solicitud NA, además de la regla de autorización anterior, deben existir obligatoriamente los siguientes datos:

- Tipo Ajuste.
- Documento Soporte a Anular.
- CUDS Documento Soporte a Anular.

Si alguno de estos campos no contiene información:

- El sistema no permite la aprobación.
- Debe mostrarse un mensaje de validación indicando los campos faltantes.

Cuando las validaciones se cumplen:

- El sistema registra automáticamente Estado = Aprobado, Aprobado por, y Fecha de Aprobación.

*(Mecanismo de registro automático: ver Referencia Técnica → Campos de la Solicitud.)*

---

# Corrección de Errores Post-Aprobación

Una solicitud aprobada **(DSE o NA)** no se edita ni se reabre bajo ninguna circunstancia.

Si se detecta un error en un **DSE ya aprobado**, la corrección se gestiona mediante una **nueva** **solicitud tipo NA** que referencie el documento original en los campos Documento Soporte a Anular y CUDS Documento Soporte a Anular. No existe, por ahora, un mecanismo equivalente para corregir o anular una **NA ya aprobada** con error.

---

# Validación Anti-Duplicados

---

- Aplica de forma **cross-company** (todas las empresas de la instancia).
- Combinación bloqueada: mismo **NIF** + mismo **No. Documento Original**.

*(Mecanismo de validación por modo, y mensaje exacto: ver Referencia Técnica → Mecanismos de Validación y Flujo en IFS.)*

---

# Segunda Parte: Registro y Envío

Aplica una vez que la solicitud está en estado **Aprobado**.

## Creación de Factura de Proveedor

- Se crea una Factura Manual Proveedor en IFS, referenciando la solicitud aprobada correspondiente.
- Se registran los datos propios de la factura: Proveedor, Divisa, Subtotal, Impuestos, Cuenta Contable y demás datos requeridos por el proceso contable estándar.

*(Detalle de campo LOV, filtros y comportamiento de pantalla: ver Referencia Técnica → Mecanismos de Validación y Flujo en IFS.)*

### Reconciliación entre Solicitud y Factura

**Decisiones de negocio explícitas — no hay validación de coincidencia entre solicitud y factura:**

- **Monto:** no se valida ningún tipo de coincidencia entre el Monto aprobado en la solicitud y los datos de la factura (Subtotal, Impuestos, Total). El desglose de impuestos y retenciones, y el registro en pesos colombianos cuando la factura original esté en otra divisa, se resuelven íntegramente en el registro de la factura, sin relación con el Monto de la solicitud. Esta es una decisión de negocio explícita: el control de aprobación de la Primera Parte no se extiende a verificar que lo facturado coincida con lo aprobado.
- **NIF:** el NIF capturado en la solicitud no acepta espacios. El NIF que se envía en el XML a Carvajal es el del Proveedor registrado en la factura, no necesariamente el capturado en la solicitud — dado que en muchos casos el proveedor no existe en el ERP al momento de la solicitud y se da de alta manualmente antes de crear la factura. No hay validación que obligue a que ambos NIF coincidan.
- **Proveedor:** no existe validación que relacione el proveedor de la factura con ningún dato de la solicitud (la solicitud no captura un campo de Proveedor, solo NIF).

## Vigencia de Series DSE / NA

- Solo puede existir una serie con estado Vigente por empresa y por Tipo de Documento al mismo tiempo.

*(Configuración técnica de la ventana de Series: ver Referencia Técnica → Configuración de Series DSE por Empresa.)*

## Generación del Documento Electrónico DS

- Una vez contabilizada la factura, se asigna el folio DSE desde la serie vigente configurada en IFS (ver página Referencia Técnica).
- El folio identifica el documento ante la DIAN. Es distinto al No. Factura interno de IFS.

## Envío de DSE al PAC (Carvajal)

- Una vez generado el folio, la solicitud queda lista para enviarse al PAC para su validación ante la DIAN.

*(Mecanismo de envío, botón y estructura del archivo: ver Referencia Técnica → Mecanismos de Validación y Flujo en IFS e Integración con PAC.)*

## Respuesta del Servicio

- El resultado de la validación del PAC debe quedar visible para Contabilidad dentro del ERP.

*(Mecanismo de despliegue del mensaje: ver Referencia Técnica.)*

## Validación DIAN y CUDS

- Si la DIAN valida el documento, retorna un CUDS a través de Carvajal.
- ⚠️ Pendiente: confirmar con HMV si el CUDS llega vía servicios Carvajal o por otro mecanismo.  para identificar dentro del ERP que la DIAN aceptó el Documento Electrónico DS enviado (ver Puntos Pendientes).

## Cancelación de Factura

- Si se cancela una factura en el ERP, se elimina únicamente la **relación** entre la factura y la solicitud aprobada. El registro de la solicitud aprobada y su historial de aprobación **no se eliminan ni se modifican.**
- Al limpiarse la relación, la solicitud vuelve a estar disponible para seleccionarse en una nueva factura.
- Esta regla aplica únicamente si el Documento Electrónico DSE **no ha sido aceptado por la DIAN**. Si ya fue aceptado (ya cuenta con CUDS), no debe permitirse simplemente limpiar la relación, porque el documento fiscal ya existe fuera del ERP. El mecanismo correcto para este caso queda pendiente de definir (ver Puntos Pendientes).

*(Campo técnico afectado y detalle de Anexos A y B: ver Referencia Técnica → Mecanismos de Validación y Flujo en IFS, y página Puntos Pendientes.)*