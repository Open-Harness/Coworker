import { useToast } from "@astryxdesign/core/Toast";
import { useApi, useBrowser, useRefresh } from "~/modules/page/service.ts";
import type { Values } from "~/modules/api/types.ts";

/** Does one thing on the console, says what came of it, and reads again what it changed. Answers whether it was done. */
export function useDoing(): (doing: string, values: Values) => Promise<boolean> {
  const [api, refresh, { newId }, showToast] = [useApi(), useRefresh(), useBrowser(), useToast()];
  return async (doing, values) => {
    const did = await api.write("/do", { doing, values, key: newId() });
    const says =
      did._tag === "Problem"
        ? did.says
        : did.value._tag === "Done"
          ? did.value.says
          : did.value._tag === "Asked"
            ? "It waits for a yes, in your inbox."
            : did.value._tag === "Refused"
              ? did.value.why
              : did.value._tag === "Problems"
                ? (did.value.problems[0]?.says ?? "It did not go through.")
                : "Someone changed it first.";
    showToast({ body: says, uniqueID: `${doing}-${newId()}` });
    const done = did._tag === "Ok" && (did.value._tag === "Done" || did.value._tag === "Asked");
    if (done) refresh(["/coworker", "/shell", "/inbox"]);
    return done;
  };
}
