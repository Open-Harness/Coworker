import type { CommandOutcome } from "~/modules/protocol/types.ts";
import type { Author } from "~/modules/transcript/types.ts";
import type { Registration, RelayedCommand, WorkspacePort } from "../types.ts";

/** Requests between the app's own objects. The Worker never forwards this prefix from outside. */
export const INTERNAL = "https://internal/internal";

interface Stub {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}
export interface StubNamespace {
  getByName(name: string): Stub;
}

const post = (stub: Stub, path: string, body: unknown): Promise<Response> =>
  stub.fetch(`${INTERNAL}/${path}`, { method: "POST", body: JSON.stringify(body) });

async function acknowledged(request: Promise<Response>): Promise<{ readonly ok: boolean }> {
  try {
    return { ok: (await request).ok };
  } catch {
    return { ok: false };
  }
}

const unavailable: CommandOutcome = {
  ok: false,
  error: { code: "unavailable", message: "The workspace did not answer. Try again" },
};

export const createWorkspacePort = (namespace: StubNamespace): WorkspacePort => ({
  provision: (registration) => acknowledged(post(namespace.getByName(registration.workspaceId), "provision", registration)),
  rename: (registration) => acknowledged(post(namespace.getByName(registration.workspaceId), "rename", registration)),
  destroy: (workspaceId) => acknowledged(post(namespace.getByName(workspaceId), "destroy", {})),
  relay: async (command, by) => {
    try {
      const response = await post(namespace.getByName(command.workspaceId), "relay", { command, by });
      // Written by this app's own object in the same deployment.
      return response.ok ? ((await response.json()) as CommandOutcome) : unavailable;
    } catch {
      return unavailable;
    }
  },
});

export type InternalRequest =
  | { readonly path: "provision" | "rename"; readonly body: Registration }
  | { readonly path: "destroy" }
  | { readonly path: "relay"; readonly body: { readonly command: RelayedCommand; readonly by: Author } };
