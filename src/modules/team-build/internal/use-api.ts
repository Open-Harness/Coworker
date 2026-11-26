import { useCallback, useMemo } from "react";
import { useLoading, useServer } from "~/modules/team-core/service.ts";
import type { Loading } from "~/modules/team-core/types.ts";
import type { BuildApi, ModelOption, Role } from "../types.ts";
import { createBuildApi } from "./api.ts";

export const useBuildApi = (): BuildApi => {
  const server = useServer();
  return useMemo(() => createBuildApi(server), [server]);
};

/** What the person may do here, and the models the workspace can think with. */
export function useGeneral(api: BuildApi, workspaceId: string): Loading<{ readonly role: Role; readonly models: readonly ModelOption[] }> {
  return useLoading(useCallback(() => api.general(workspaceId), [api, workspaceId]));
}
