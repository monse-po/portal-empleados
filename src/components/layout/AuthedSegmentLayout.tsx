import { redirect } from "next/navigation";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";

/** Layout de módulos: muro de login solo si IFS OAuth está listo. */
export default async function AuthedSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isIfsAuthReady()) {
    const session = await getServerIfsSession();
    if (!session?.email) redirect("/login");
  }
  return children;
}
