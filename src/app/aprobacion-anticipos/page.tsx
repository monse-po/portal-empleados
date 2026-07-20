import { AprobacionAnticiposView } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposView";
import { RoleRouteGuard } from "@/src/components/layout/RoleRouteGuard";

export default function AprobacionAnticiposPage() {
  return (
    <RoleRouteGuard allow="gerente">
      <AprobacionAnticiposView />
    </RoleRouteGuard>
  );
}
