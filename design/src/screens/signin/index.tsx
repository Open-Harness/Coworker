// astryx-template: login-card
import { SignIn } from "../../door/SignIn";
export default function Page() {
  return <SignIn words={{ title: "Welcome back", description: "Sign in to your workspace", send: "Email me a link", other: "New here?", otherLink: "Create an account", otherHref: "#signup", next: "system", terms: false }} />;
}
