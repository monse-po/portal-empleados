import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { loginErrorMessage } from "@/src/lib/ifs/login-messages";
import { LoginScreen } from "./LoginScreen";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: nextRaw, error, email: emailRaw } = await searchParams;
  const next =
    nextRaw?.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/hoja-tiempo";
  const canOauth = isIfsAuthReady();
  const errorText = error ? loginErrorMessage(error) : null;

  return (
    <LoginScreen
      next={next}
      defaultEmail={emailRaw?.trim() || ""}
      canOauth={canOauth}
      errorText={errorText}
    />
  );
}
