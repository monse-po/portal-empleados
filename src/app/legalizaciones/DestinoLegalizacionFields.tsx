"use client";

import { Field } from "@/src/components/ui/Field";
import {
  SearchableSelect,
  optionsFromStrings,
} from "@/src/components/ui/SearchableSelect";
import {
  getActividadesDestino,
  getSubproyectosDestino,
  type DestinoLegalizacion,
} from "@/src/lib/legalizaciones-mock";

type DestinoLegalizacionFieldsProps = {
  value: DestinoLegalizacion;
  onChange: (value: DestinoLegalizacion) => void;
  /** Sin proyecto definido aún (p. ej. falta proyecto en línea de gasto). */
  proyectoPendiente?: boolean;
};

export function DestinoLegalizacionFields({
  value,
  onChange,
  proyectoPendiente = false,
}: DestinoLegalizacionFieldsProps) {
  const subproyectos = value.proyectoId
    ? getSubproyectosDestino(value.proyectoId)
    : [];
  const actividades =
    value.proyectoId && value.subproyecto
      ? getActividadesDestino(value.proyectoId, value.subproyecto)
      : [];

  const sinProyecto = !value.proyectoId || proyectoPendiente;
  const hintSinProyecto = proyectoPendiente
    ? "Define el proyecto en la línea de gasto"
    : "Selecciona un anticipo primero";

  const handleSubproyectoChange = (subproyecto: string) => {
    onChange({ ...value, subproyecto, actividad: "" });
  };

  return (
    <>
      <Field label="Subproyecto" required>
        <SearchableSelect
          value={value.subproyecto}
          onChange={handleSubproyectoChange}
          options={optionsFromStrings(subproyectos)}
          placeholder={
            sinProyecto ? hintSinProyecto : "Seleccionar subproyecto…"
          }
          searchPlaceholder="Buscar subproyecto…"
          disabled={sinProyecto}
          className="ant-field-input"
        />
      </Field>

      <Field label="Actividad" required>
        <SearchableSelect
          value={value.actividad}
          onChange={(actividad) => onChange({ ...value, actividad })}
          options={optionsFromStrings(actividades)}
          placeholder={
            value.subproyecto
              ? "Seleccionar actividad…"
              : "Selecciona un subproyecto primero"
          }
          searchPlaceholder="Buscar actividad…"
          disabled={!value.subproyecto}
          className="ant-field-input"
        />
      </Field>
    </>
  );
}
