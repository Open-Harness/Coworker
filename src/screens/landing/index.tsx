import { useEffect } from "react";
import { useGo, useOutside, Waiting } from "~/modules/page/service.ts";

/** `/`: where a person is taken. Their workspace if they have one, the start of one if not, the door if nobody is signed in. */
export default function Landing() {
  const outside = useOutside();
  const go = useGo();
  useEffect(() => {
    void outside.get("/api/workspaces").then((answer) => {
      if (answer._tag !== "Ok") return go(answer.status === 401 ? "//sign-in" : "//start", { replace: true });
      const body = answer.value;
      const rows =
        typeof body === "object" && body !== null && "workspaces" in body && Array.isArray(body.workspaces) ? body.workspaces : [];
      const first: unknown = rows[0];
      const address =
        typeof first === "object" && first !== null && "address" in first && typeof first.address === "string" ? first.address : undefined;
      go(address === undefined ? "//start" : `/ws/${encodeURIComponent(address)}`, { replace: true });
    });
  }, [outside, go]);
  return <Waiting />;
}
