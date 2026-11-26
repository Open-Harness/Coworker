import { useState } from "react";
import type { ItemData, Reply } from "../types.ts";
import { useTeamApi } from "./context.ts";

/** Sends a person's reply to one item, the same way wherever it is asked; what the server refused is `failure`. */
export function useAnswer(workspaceId: string, onAnswered: (item: ItemData) => void) {
  const api = useTeamApi();
  const [failure, setFailure] = useState<string>();
  const send = async (itemId: string, reply: Reply): Promise<void> => {
    const sent = await api.answer(workspaceId, itemId, reply);
    if (sent._tag === "Loaded") onAnswered(sent.value);
    setFailure(sent._tag === "Failed" ? sent.message : undefined);
  };
  return { failure, send };
}
