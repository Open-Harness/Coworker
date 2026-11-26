import type { Answer, AskResult, AuditLine, InboxRequest } from "~/modules/manager/types.ts";
import { budgets } from "~/modules/settings/service.ts";
import { ask, auditLog, inboxOf, recordActions } from "./internal/inbox.ts";
import { answerAndWake, hearFor } from "./internal/answers.ts";
import { requestJoin } from "./internal/requests.ts";
import { createManager, destroyManagers, listManagers } from "./internal/managers.ts";
import { migrate, readProfile, writeProfile } from "./internal/store.ts";
import { SettingsHost } from "./internal/settings-host.ts";
import { allowsJoin, readJoinSettings, setApprovedDomains, setInviteLinks } from "./internal/joining.ts";
import { eventsOf, follow, logEvent, readPolicy, writePolicy } from "./internal/hearing.ts";
import type { Handle, Policy, Routed, Trigger } from "~/modules/triggers/types.ts";
import { addHandle, people } from "./internal/people.ts";
import type { GitHubConnection, Installation, LostConnection, RepoSource } from "~/modules/github/types.ts";
import type { BillingView, SpendLimit } from "~/modules/billing/types.ts";
import { meteredCommand } from "./internal/metered.ts";
import type { CommandRequest, EnvironmentView, ExecOutcome, SaveEnvironment, SaveResult } from "~/modules/sandboxes/types.ts";
import { commandToken } from "./internal/token.ts";
import { connect, connection, lostConnection, removed, setSources } from "./internal/github.ts";
import type {
  AddHandleResult,
  AnswerResult,
  AuditEntry,
  CreateManager,
  CreateManagerResult,
  InboxItem,
  ManagerEntry,
  DescribeResult,
  EventEntry,
  JoinProof,
  JoinRequester,
  JoinSettingsResult,
  NotProvisioned,
  PersonHandles,
  ProvisionResult,
  RequestJoinResult,
  SetDomainsResult,
  SetSourcesResult,
  WorkspaceApi,
  WorkspaceProfile,
} from "./types.ts";

/**
 * One tenant: its people, sources, vault, Inbox, audit log and list of managers, in one Durable Object. The
 * composition root subclasses it to pass the dependencies.
 */
export class WorkspaceHost<Env = unknown> extends SettingsHost<Env> implements WorkspaceApi {
  async provision(profile: WorkspaceProfile): Promise<ProvisionResult> {
    const existing = readProfile(this.ctx.storage.sql);
    if (existing !== undefined) return { _tag: "AlreadyProvisioned", workspaceId: existing.workspaceId };
    writeProfile(this.ctx.storage.sql, profile);
    return { _tag: "Provisioned" };
  }

  async describe(): Promise<DescribeResult> {
    const profile = readProfile(this.ctx.storage.sql);
    return profile === undefined ? { _tag: "NotProvisioned" } : { _tag: "Found", profile };
  }

  async joinSettings(): Promise<JoinSettingsResult> {
    return this.provisioned() ? { _tag: "Settings", settings: readJoinSettings(this.ctx.storage.sql) } : { _tag: "NotProvisioned" };
  }

  async setInviteLinks(on: boolean): Promise<JoinSettingsResult> {
    if (!this.provisioned()) return { _tag: "NotProvisioned" };
    return { _tag: "Settings", settings: setInviteLinks(this.ctx.storage.sql, this.dependencies.ids, on) };
  }

  async setApprovedDomains(domains: readonly string[]): Promise<SetDomainsResult> {
    return this.provisioned() ? setApprovedDomains(this.ctx.storage.sql, domains) : { _tag: "NotProvisioned" };
  }

  async allowsJoin(proof: JoinProof): Promise<boolean> {
    return this.provisioned() && allowsJoin(this.ctx.storage.sql, proof);
  }

  async createManager(input: CreateManager): Promise<CreateManagerResult> {
    const workspace = readProfile(this.ctx.storage.sql);
    if (workspace === undefined) return { _tag: "NotProvisioned" };
    const { managers: objects, mailDomain, ids, clock } = this.dependencies;
    const objectId = this.ctx.id.toString();
    const place = { sql: this.ctx.storage.sql, workspace, objectId, objects, mailDomain, managerId: ids.next("mgr"), now: clock.now() };
    return createManager(place, input);
  }

  async managers(): Promise<readonly ManagerEntry[]> {
    const workspace = readProfile(this.ctx.storage.sql);
    return workspace === undefined ? [] : listManagers(this.ctx.storage.sql, workspace);
  }

  async recordActions(lines: readonly AuditLine[]): Promise<void> {
    if (this.provisioned()) recordActions(this.ctx.storage.sql, lines);
  }

  async auditLog(limit: number): Promise<readonly AuditEntry[]> {
    return this.provisioned() ? auditLog(this.ctx.storage.sql, limit) : [];
  }

  async ask(request: InboxRequest): Promise<AskResult> {
    const asked = ask(this.ctx.storage.sql, request, this.dependencies.clock.now());
    await this.offer();
    return asked;
  }

  async inbox(personId: string): Promise<readonly InboxItem[]> {
    return this.provisioned() ? inboxOf(this.ctx.storage.sql, personId) : [];
  }

  async answer(itemId: string, given: Answer): Promise<AnswerResult> {
    const workspace = readProfile(this.ctx.storage.sql);
    if (workspace === undefined) return { _tag: "NoSuchItem" };
    const answered = await answerAndWake(this.ctx.storage.sql, workspace, this.dependencies.managers, itemId, given);
    if (answered._tag === "Answered") await this.carryOut(itemId, given);
    return answered;
  }

  async receive(trigger: Trigger): Promise<Routed> {
    const { sql } = this.ctx.storage;
    return hearFor(sql, readProfile(sql), this.dependencies.managers, trigger, this.dependencies.clock.now());
  }

  async requestJoin(person: JoinRequester, owners: readonly string[]): Promise<RequestJoinResult> {
    if (!this.provisioned()) return { _tag: "NotProvisioned" };
    const requested = requestJoin(this.ctx.storage.sql, person, owners, this.dependencies.clock.now());
    await this.offer();
    return requested;
  }

  async follow(managerId: string, task: string, threads: Trigger["threads"]): Promise<void> {
    follow(this.ctx.storage.sql, managerId, task, threads);
  }

  async logEvent(managerId: string, line: string): Promise<void> {
    logEvent(this.ctx.storage.sql, managerId, this.dependencies.clock.now(), line);
  }

  async events(managerId: string, limit: number): Promise<readonly EventEntry[]> {
    return eventsOf(this.ctx.storage.sql, managerId, limit);
  }

  async policy(managerId: string): Promise<Policy> {
    return readPolicy(this.ctx.storage.sql, managerId);
  }

  async setPolicy(managerId: string, policy: Policy): Promise<Policy> {
    return writePolicy(this.ctx.storage.sql, managerId, policy);
  }

  async addHandle(person: string, handle: Handle): Promise<AddHandleResult> {
    return addHandle(this.ctx.storage.sql, person, handle);
  }

  async people(): Promise<readonly PersonHandles[]> {
    return people(this.ctx.storage.sql);
  }

  async connectGitHub(installation: Installation): Promise<GitHubConnection> {
    return connect(this.ctx.storage.sql, installation);
  }

  async gitHub(): Promise<GitHubConnection> {
    return connection(this.ctx.storage.sql);
  }

  async gitHubLost(): Promise<LostConnection | undefined> {
    return lostConnection(this.ctx.storage.sql);
  }

  async setRepoSources(managerId: string, sources: readonly Omit<RepoSource, "managerId">[]): Promise<SetSourcesResult> {
    return setSources(this.ctx.storage.sql, managerId, sources);
  }

  async gitHubRemoved(installation: number, owners: readonly string[]): Promise<void> {
    removed(this.ctx.storage.sql, installation, owners, this.dependencies.clock.now());
    await this.offer();
  }

  async environments(): Promise<readonly EnvironmentView[]> {
    return this.provisioned() ? this.sandboxes().environments() : [];
  }

  async saveEnvironment(input: SaveEnvironment): Promise<SaveResult | NotProvisioned> {
    return this.provisioned() ? this.sandboxes().save(input) : { _tag: "NotProvisioned" };
  }

  async sandbox(request: CommandRequest): Promise<ExecOutcome | NotProvisioned> {
    const profile = readProfile(this.ctx.storage.sql);
    const place = this.settingsPlace();
    if (profile === undefined || place === undefined) return { _tag: "NotProvisioned" };
    const refused = budgets.blocked(place, request.managerId);
    if (refused !== undefined) return { _tag: "Stopped", reason: refused };
    // A token for this one command, as its process environment: made fresh, never stored, hidden in the output.
    const token = await commandToken(this.dependencies.github, connection(this.ctx.storage.sql), request);
    const extra = token === undefined ? {} : { GH_TOKEN: token };
    const outcome = await meteredCommand(this.sandboxes(), this.account(profile), request, extra);
    budgets.alertAfter(place, request.managerId);
    await this.offer();
    return outcome;
  }

  async billing(): Promise<BillingView | NotProvisioned> {
    const profile = readProfile(this.ctx.storage.sql);
    return profile === undefined ? { _tag: "NotProvisioned" } : this.account(profile).view(this.sandboxes().used);
  }

  async setSpendLimit(limit: SpendLimit): Promise<{ readonly _tag: "Set"; readonly billing: BillingView } | NotProvisioned> {
    const profile = readProfile(this.ctx.storage.sql);
    if (profile === undefined) return { _tag: "NotProvisioned" };
    return { _tag: "Set", billing: this.account(profile).setLimit(limit, this.sandboxes().used) };
  }

  async membersChanged(members: number): Promise<void> {
    const profile = readProfile(this.ctx.storage.sql);
    if (profile !== undefined) await this.account(profile).membersChanged(members, this.sandboxes().used);
  }

  async destroy(): Promise<{ readonly _tag: "Destroyed" }> {
    const workspace = readProfile(this.ctx.storage.sql);
    if (workspace !== undefined) await destroyManagers(this.ctx.storage.sql, workspace, this.dependencies.managers);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    // An empty schema again, so the object answers NotProvisioned like one nobody made.
    migrate(this.ctx.storage.sql);
    return { _tag: "Destroyed" };
  }
}
