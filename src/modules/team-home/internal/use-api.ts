import { useMemo } from "react";
import { useServer } from "~/modules/team-core/service.ts";
import type { HomeApi } from "../types.ts";
import { createHomeApi } from "./api.ts";

export const useHomeApi = (): HomeApi => {
  const server = useServer();
  return useMemo(() => createHomeApi(server), [server]);
};
