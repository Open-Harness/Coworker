import type { ReactNode } from "react";
import type { TeamAppDependencies } from "../types.ts";
import { TeamAppContext } from "./context.ts";

/** Gives the API, and who is using it, to every screen under it. */
export const TeamApp = ({ dependencies, children }: { readonly dependencies: TeamAppDependencies; readonly children: ReactNode }) => (
  <TeamAppContext value={dependencies}>{children}</TeamAppContext>
);
