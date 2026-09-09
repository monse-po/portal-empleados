import { redirect } from "next/navigation";
import { RoleHomeRedirect } from "@/src/components/layout/RoleHomeRedirect";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";

export default async function Home() {
  if (isIfsAuthEnabled()) {
    const session = await getServerIfsSession();
    if (!session?.email) redirect("/login");
  }
  return <RoleHomeRedirect />;
}
