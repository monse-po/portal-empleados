import { AprobacionView } from "@/src/app/aprobacion-tiempo/AprobacionView";
import { RoleRouteGuard } from "@/src/components/layout/RoleRouteGuard";

export default function AprobacionTiempoPage() {
  return (
    <RoleRouteGuard allow="gerente">
      <AprobacionView />
    </RoleRouteGuard>
  );
}
