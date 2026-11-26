// astryx-template: login-card
import { SignIn } from "~/door/SignIn.tsx";

export default function SignUpPage() {
  return (
    <SignIn
      words={{
        title: "Create your account",
        description: "Then make a workspace, or join your team’s",
        send: "Email me a link",
        other: "Already have an account?",
        otherLink: "Sign in",
        otherHref: "/sign-in",
        terms: true,
      }}
    />
  );
}
