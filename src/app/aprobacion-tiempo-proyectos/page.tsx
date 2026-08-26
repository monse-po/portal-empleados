import { AprobacionProyectosView } from "@/src/app/aprobacion-tiempo-proyectos/AprobacionProyectosView";
import { RoleRouteGuard } from "@/src/components/layout/RoleRouteGuard";

export default function AprobacionTiempoProyectosPage() {
  return (
    <RoleRouteGuard allow="gerente">
      <AprobacionProyectosView />
    </RoleRouteGuard>
  );
}
