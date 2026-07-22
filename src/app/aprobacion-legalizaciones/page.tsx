import { AprobacionLegalizacionesView } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesView";
import { RoleRouteGuard } from "@/src/components/layout/RoleRouteGuard";

export default function AprobacionLegalizacionesPage() {
  return (
    <RoleRouteGuard allow="gerente">
      <AprobacionLegalizacionesView />
    </RoleRouteGuard>
  );
}
