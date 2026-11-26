import { useMemo } from "react";
import { useServer } from "~/modules/team-core/service.ts";
import type { SettingsApi } from "../types.ts";
import { createSettingsApi } from "./api.ts";

/** The settings routes, for the server this screen was given. */
export function useSettingsApi(): SettingsApi {
  const server = useServer();
  return useMemo(() => createSettingsApi(server), [server]);
}
