import { redirect } from "next/navigation";

/** Legacy: la consola de Monse vive en /consola. */
export default function AccesosRedirectPage() {
  redirect("/consola");
}
