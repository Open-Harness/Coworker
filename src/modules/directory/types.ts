import type { Draft } from "~/modules/agent/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { ModelOption, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { Report, WorkspacePort } from "~/modules/chat-host/types.ts";

export interface DirectoryDependencies {
  readonly workspaces: WorkspacePort;
  readonly models: readonly ModelOption[];
  readonly draft: Drafter;
  readonly isAdmin: (person: Person) => boolean;
  readonly report: Report;
}

/** Has a model write an agent config from a description. */
export type Drafter = (description: string, signal: AbortSignal) => Promise<Draft>;

/**
 * Where a workspace stands. It is listed only while `active`. `provisioning` and `deleting` are finished later when the
 * workspace did not answer; `deleted` keeps the id from being used again.
 */
export type WorkspacePhase = "provisioning" | "active" | "deleting" | "deleted";

export type StoredWorkspace = WorkspaceRow & { readonly phase: WorkspacePhase };
