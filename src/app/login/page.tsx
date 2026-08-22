import { redirect } from "next/navigation";

/** El login de producto existe, pero no es puerta: se entra directo al portal. */
export default function LoginPage() {
  redirect("/");
}
