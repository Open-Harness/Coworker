import { useCallback } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { Load, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { CheckData, ModelData, ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { KeysScreen } from "./KeysScreen.tsx";
import { useAct } from "./use-act.ts";

/** A test call's answer, as a sentence. A failed test is still a saved key, so it is a result, not an error. */
const said = ({ label, works, error }: CheckData): string =>
  works ? `${label} works` : `${label} saved, but the test call failed: ${error ?? "no reason given"}`;

export function KeysPage({ api, workspaceId }: ScreenProps) {
  const act = useAct();
  const showToast = useToast();
  const { goTo } = useBrowser();
  const keys = useLoading(useCallback(() => api.keys(workspaceId), [api, workspaceId]));
  const gitHub = useLoading(useCallback(() => api.gitHub(workspaceId), [api, workspaceId]));
  const secrets = useLoading(useCallback(() => api.secrets(workspaceId), [api, workspaceId]));
  /** The dialog shows a failure itself; only a success is a toast. */
  const added = async (asking: Promise<Loaded<true>>): Promise<Loaded<true>> => {
    const result = await asking;
    if (result._tag === "Loaded") void act(Promise.resolve(result), "Added. The test call worked.");
    // A key whose test call failed is kept too, and shows as not working.
    keys.reload();
    return result;
  };
  const checked = async (asking: Promise<Loaded<CheckData>>): Promise<Loaded<CheckData>> => {
    const result = await asking;
    if (result._tag === "Loaded") showToast({ body: said(result.value), type: result.value.works ? "info" : "error" });
    keys.reload();
    return result;
  };
  /** A dialog stays open when the test call failed, since the key was kept and is still wrong. */
  const inDialog = async (asking: Promise<Loaded<CheckData>>): Promise<Loaded<CheckData>> => {
    const result = await asking;
    keys.reload();
    if (result._tag === "Failed") return result;
    if (!result.value.works)
      return { _tag: "Failed", message: `The change was kept, but the test call failed: ${result.value.error ?? "no reason given"}` };
    showToast({ body: said(result.value) });
    return result;
  };
  const on = {
    onRecheck: async ({ id }: ModelData) => {
      const result = await checked(api.recheckModel(workspaceId, id));
      if (result._tag === "Failed") showToast({ body: result.message, type: "error" });
    },
    onReplace: ({ id }: ModelData, key: string) => inDialog(api.replaceKey(workspaceId, id, key)),
    onEdit: ({ id }: ModelData, edit: Parameters<typeof api.editEndpoint>[2]) => inDialog(api.editEndpoint(workspaceId, id, edit)),
    onRemove: ({ id, label }: ModelData) =>
      after(api.removeModel(workspaceId, id), () => {
        showToast({ body: `${label === "" ? "The connection" : label} was removed` });
        keys.reload();
      }),
  };
  const retry = () => {
    keys.reload();
    gitHub.reload();
    secrets.reload();
  };
  return (
    <Load loaded={keys.loaded} failedTitle="Keys did not load" onRetry={retry}>
      {(value) => (
        <Load loaded={gitHub.loaded} failedTitle="Connections did not load" onRetry={retry}>
          {(connection) => (
            <Load loaded={secrets.loaded} failedTitle="Secrets did not load" onRetry={retry}>
              {(names) => (
                <KeysScreen
                  keys={value}
                  gitHub={connection}
                  secrets={names}
                  on={on}
                  onAdd={(input) => added(api.addModel(workspaceId, input))}
                  onLeave={goTo}
                  onStartChatGpt={() => api.startChatGpt(workspaceId)}
                  onFinishChatGpt={(url) => added(api.finishChatGpt(workspaceId, url))}
                  onAddSecret={(name, secret) => after(api.storeSecret(workspaceId, name, secret), secrets.reload)}
                  onRemoveSecret={(name) =>
                    after(api.removeSecret(workspaceId, name), (usedBy) => {
                      showToast({
                        body: usedBy.length === 0 ? `${name} was removed` : `${name} was removed. ${usedBy.join(", ")} named it.`,
                      });
                      secrets.reload();
                    })
                  }
                />
              )}
            </Load>
          )}
        </Load>
      )}
    </Load>
  );
}
