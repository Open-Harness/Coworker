import { createContext, useContext } from "react";
import type { AppDependencies, Session } from "../types.ts";

interface Page {
  readonly session: Session;
  readonly dependencies: AppDependencies;
}
export const PageContext = createContext<Page | undefined>(undefined);

export function usePage(): Page {
  const page = useContext(PageContext);
  if (page === undefined) throw new Error("This belongs inside the app's session");
  return page;
}

export const useSession = (): Session => usePage().session;
