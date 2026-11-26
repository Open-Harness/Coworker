// astryx-template: login-card
import { SignIn } from "../../door/SignIn";
export default function Page() {
  return <SignIn words={{ title: "Create your account", description: "Then make a workspace, or join your team’s", send: "Email me a link", other: "Already have an account?", otherLink: "Sign in", otherHref: "#signin", next: "join", terms: true }} />;
}
