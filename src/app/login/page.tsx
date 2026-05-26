import { Suspense } from "react";
import { isGoogleAuthEnabled } from "@/server/auth-config";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <Suspense fallback={null}>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
