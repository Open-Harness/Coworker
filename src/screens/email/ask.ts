import { useCallback } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { useApi, useRead, useRefresh } from "~/modules/page/service.ts";

/** Says yes to an ask that waits in the inbox: the option the manager recommends, or the first it offers. */
export function useAsk(): (ask: string) => Promise<void> {
  const [api, refresh, toast, inbox] = [useApi(), useRefresh(), useToast(), useRead("/inbox")];
  return useCallback(
    async (ask: string) => {
      const found = inbox._tag === "Ok" ? inbox.value.items.find((item) => item.ask.id === ask)?.ask : undefined;
      const option = found?.best ?? found?.options[0]?.id;
      if (option === undefined) return void toast({ body: "That is not waiting for you any more.", uniqueID: `gone-${ask}` });
      const did = await api.write("/inbox/:ask", { answer: option }, { ask });
      if (did._tag !== "Ok") return void toast({ body: `That did not go through. ${did.says}`, uniqueID: `failed-${ask}` });
      refresh(["/inbox", "/shell"]);
    },
    [api, refresh, toast, inbox],
  );
}
