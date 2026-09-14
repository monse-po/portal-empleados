import { redirect } from "next/navigation";
import { isPortalLoginRequired } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";

/** Layout de módulos del portal: sin sesión IFS, a /login (no shell ni DSE). */
export default async function AuthedSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isPortalLoginRequired()) {
    const session = await getServerIfsSession();
    if (!session?.email) redirect("/login");
  }
  return children;
}
