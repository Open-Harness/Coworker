import { createContext, use } from "react";
import type { JoinApi, Who } from "../types.ts";

interface SessionValue {
  readonly api: JoinApi;
  readonly who: Who | undefined;
  /** Signs this browser out. */
  readonly leave: () => Promise<void>;
}

/** Who is at this browser, given by `Session` to every page under it. */
export const SessionContext = createContext<SessionValue | undefined>(undefined);

export function useSession(): SessionValue {
  const session = use(SessionContext);
  if (session === undefined) throw new Error("A screen of the app was drawn outside Session");
  return session;
}

/** Who is signed in. Only for pages shown to someone who is. */
export function useMe(): Who {
  const { who } = useSession();
  if (who === undefined) throw new Error("A screen that needs someone signed in was shown to nobody");
  return who;
}

export const useLeave = (): (() => Promise<void>) => useSession().leave;
