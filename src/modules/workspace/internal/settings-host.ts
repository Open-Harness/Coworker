import type { By } from "~/modules/actions/types.ts";
import type { ApprovalRequest, AuditQuery } from "~/modules/actions/types.ts";
import type { AgentLookup, AgentSummary, Answer, SkillRead } from "~/modules/manager/types.ts";
import { agentToStart, agentsToStart, createSettings, readSkillFile, runSettings } from "~/modules/settings/service.ts";
import type { SettingsCall, SettingsResult } from "~/modules/settings/types.ts";
import type { AuditPage, NotProvisioned } from "../types.ts";
import { queryAudit } from "./audit.ts";
import { listManagers } from "./managers.ts";
import { takeUnoffered } from "./notices.ts";
import { requestApproval, settleApproval } from "./person-asks.ts";
import { recordActions } from "./inbox.ts";
import { VaultHost } from "./vault-host.ts";
import { readProfile } from "./store.ts";

/** The workspace itself, as the one who offers an Inbox item to the people mailed it. */
const WORKSPACE_BY: By = { kind: "person", id: "workspace", name: "Co-worker" };

/**
 * The Settings screens' door, the audit log's reading, and what waits for an Owner on a person's behalf. Over the vault
 * and model connections of `VaultHost`; `WorkspaceHost` adds the rest.
 */
export abstract class SettingsHost<Env> extends VaultHost<Env> {
  async auditQuery(query: AuditQuery): Promise<AuditPage> {
    return this.provisioned() ? queryAudit(this.ctx.storage.sql, query) : { entries: [] };
  }

  async agent(name: string): Promise<AgentLookup> {
    const place = this.settingsPlace();
    return place === undefined ? { _tag: "NotProvisioned" } : agentToStart(place, name);
  }

  async agents(): Promise<readonly AgentSummary[]> {
    const place = this.settingsPlace();
    return place === undefined ? [] : agentsToStart(place);
  }

  async skillFile(input: { readonly skill: string; readonly version: number; readonly path: string }): Promise<SkillRead> {
    const place = this.settingsPlace();
    return place === undefined ? { _tag: "Gone" } : readSkillFile(place, input);
  }

  async settings(call: SettingsCall, by: By): Promise<SettingsResult | NotProvisioned> {
    const place = this.settingsPlace();
    return place === undefined ? { _tag: "NotProvisioned" } : runSettings(createSettings(place), call, by);
  }

  /** Offers each new Inbox item to the people who asked to be mailed it. */
  protected async offer(): Promise<void> {
    const items = this.provisioned() ? takeUnoffered(this.ctx.storage.sql, this.dependencies.clock.now()) : [];
    const place = items.length === 0 ? undefined : this.settingsPlace();
    if (place === undefined) return;
    const { deliver } = createSettings(place);
    for (const item of items) await deliver(item, WORKSPACE_BY);
  }

  async requestApproval(
    call: ApprovalRequest,
    approvers: readonly string[],
  ): Promise<{ readonly _tag: "Requested" | "AlreadyRequested" } | NotProvisioned> {
    const { sql } = this.ctx.storage;
    const profile = readProfile(sql);
    const entry = profile === undefined ? undefined : listManagers(sql, profile).find(({ managerId }) => managerId === call.managerId);
    if (entry === undefined) return { _tag: "NotProvisioned" };
    const asked = requestApproval(sql, call, approvers, entry.name, this.dependencies.clock.now());
    await this.offer();
    return asked;
  }

  /** An Owner answered a person's ask: allowed, the manager does it as that person's press; denied, a refused line says so. */
  protected async carryOut(itemId: string, given: Answer): Promise<void> {
    const { sql } = this.ctx.storage;
    const profile = readProfile(sql);
    const place = this.settingsPlace();
    const settled = settleApproval(sql, itemId, given);
    const entry =
      settled === undefined || profile === undefined
        ? undefined
        : listManagers(sql, profile).find((m) => m.managerId === settled.request.managerId);
    if (settled === undefined || place === undefined || entry === undefined) return;
    const { request } = settled;
    if (!settled.approved) {
      const record = {
        action: request.actionId,
        input: request.input,
        by: { kind: "person", ...request.by } as const,
        at: place.clock.now(),
        permission: "ask",
        approvedBy: given.byId,
        sentence: request.sentence,
        outcome: "refused",
      } as const;
      recordActions(sql, [{ key: `ask:${request.requestId}:denied`, managerId: request.managerId, record }]);
      return;
    }
    const own = await createSettings(place).ownOf({ person: request.by.id }, WORKSPACE_BY);
    await this.dependencies.managers.get(entry.objectId, entry.region).act({
      actionId: request.actionId,
      input: request.input,
      by: request.by,
      preset: request.preset,
      own,
      requestId: `ask:${request.requestId}`,
      approvedBy: given.byId,
    });
  }
}
