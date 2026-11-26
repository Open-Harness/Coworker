import { useCallback, useState } from "react";
import { useBrowser } from "~/modules/team-core/service.ts";
import type { BuildApi } from "../types.ts";
import { type Saver, useSave } from "./use-save.ts";

export interface Presser {
  readonly saver: Saver;
  /** What an action that is set to ask is waiting for, in its own sentence. */
  readonly waiting: string | undefined;
  /** Presses one button of the manager's: done, waiting for an Owner to allow it, or failed (the saver says why). */
  readonly press: (actionId: string, input: Readonly<Record<string, unknown>>) => Promise<"done" | "waiting" | "failed">;
}

/** The same buttons the manager's tools are: one action by its id, with what the server said about it. */
export function usePress(api: BuildApi, workspaceId: string, managerId: string, onDone: () => void): Presser {
  const saver = useSave();
  const { newId } = useBrowser();
  const [waiting, setWaiting] = useState<string>();
  const { run } = saver;
  const press = useCallback(
    async (actionId: string, input: Readonly<Record<string, unknown>>): Promise<"done" | "waiting" | "failed"> => {
      const pressed = await run(() => api.press(workspaceId, managerId, actionId, input, newId()));
      setWaiting(pressed?._tag === "Waiting" ? pressed.sentence : undefined);
      if (pressed?._tag === "Done") onDone();
      return pressed === undefined ? "failed" : pressed._tag === "Done" ? "done" : "waiting";
    },
    [api, workspaceId, managerId, newId, onDone, run],
  );
  return { saver, waiting, press };
}
