import { createContext, use } from "react";
import type { TeamAppDependencies } from "../types.ts";

/** The API and who is using it, given by `TeamApp` to every screen under it. */
export const TeamAppContext = createContext<TeamAppDependencies | undefined>(undefined);

function useTeamApp(): TeamAppDependencies {
  const app = use(TeamAppContext);
  if (app === undefined) throw new Error("A screen of the app was drawn outside TeamApp");
  return app;
}

export const useTeamApi = () => useTeamApp().api;
export const useMe = (): string => useTeamApp().me;
