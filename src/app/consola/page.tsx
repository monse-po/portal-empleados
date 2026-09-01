import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Consola UAT desactivada: el foco es el ambiente DEMO compartible. */
export default function ConsolaPage() {
  redirect("/hoja-tiempo");
}
