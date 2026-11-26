import { useToast } from "@astryxdesign/core/Toast";
import { useApi, useBrowser, useRefresh } from "~/modules/page/service.ts";

/** Tell the manager about a conversation, write as the co-worker, or hand it back; then ask again what changed. */
export function useSending(connector: string, manager: string) {
  const [api, refresh, { newId }, toast] = [useApi(), useRefresh(), useBrowser(), useToast()];
  return {
    async send(conversation: string, is: "tell" | "write" | "hand back", text: string): Promise<void> {
      if (is !== "hand back" && text.trim() === "") return;
      const did = await api.write(
        "/m/:manager/connectors/:connector/:conversation",
        { is, text: text.trim(), key: newId() },
        { manager, connector, conversation },
      );
      if (did._tag !== "Ok") return void toast({ body: `That did not go through. ${did.says}`, uniqueID: `failed-${conversation}` });
      refresh([`/m/${manager}/connectors/${connector}/${conversation}`, `/m/${manager}/connectors/${connector}`]);
    },
  };
}
