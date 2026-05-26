import { isGoogleAuthEnabled } from "@/server/auth-config";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthEnabled()} />;
}
