// astryx-template: login-card
import { SignIn } from "~/door/SignIn.tsx";

export default function SignInPage() {
  return (
    <SignIn
      words={{
        title: "Welcome back",
        description: "Sign in to your workspace",
        send: "Email me a link",
        other: "New here?",
        otherLink: "Create an account",
        otherHref: "/sign-up",
        terms: false,
      }}
    />
  );
}
