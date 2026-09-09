import { redirect } from "next/navigation";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";

/** Layout de módulos del portal: sin sesión IFS, a /login (no shell ni DSE). */
export default async function AuthedSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    isIfsAuthEnabled() ||
    process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true"
  ) {
    const session = await getServerIfsSession();
    if (!session?.email) redirect("/login");
  }
  return children;
}
