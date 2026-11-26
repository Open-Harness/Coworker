import { DurableObject } from "cloudflare:workers";
import { openModels } from "~/modules/models/service.ts";
import type {
  AddEndpoint,
  AddKey,
  AddResult,
  ModelCall,
  ModelConnection,
  ModelPick,
  ModelRoute,
  Models,
  Readiness,
} from "~/modules/models/types.ts";
import { agentEnvironments, defaultModelOf } from "~/modules/settings/service.ts";
import { openVault } from "~/modules/vault/service.ts";
import type { SecretInfo, Vault } from "~/modules/vault/types.ts";
import { openSandboxes } from "~/modules/sandboxes/service.ts";
import type { Prepared, Sandboxes } from "~/modules/sandboxes/types.ts";
import { openAccount } from "~/modules/billing/service.ts";
import type { Account } from "~/modules/billing/types.ts";
import type { SettingsPlace } from "~/modules/settings/types.ts";
import type { NotProvisioned, WorkspaceDependencies, WorkspaceProfile } from "../types.ts";
import { settingsPlace } from "./place.ts";
import { appendAudit, migrate, readProfile } from "./store.ts";

/**
 * The Workspace object's vault and model connections, and its one alarm. `WorkspaceHost` adds everything else; the
 * split only keeps each file readable.
 */
export abstract class VaultHost<Env> extends DurableObject<Env> {
  protected readonly dependencies: WorkspaceDependencies;
  /** Setups in flight, so two runs that start at once share one. */
  readonly #building = new Map<string, Promise<Prepared>>();
  readonly #turns = new Map<string, Promise<unknown>>();

  constructor(ctx: DurableObjectState, env: Env, dependencies: WorkspaceDependencies) {
    super(ctx, env);
    this.dependencies = dependencies;
    ctx.blockConcurrencyWhile(async () => migrate(ctx.storage.sql));
  }

  async storeSecret(name: string, value: string): Promise<{ readonly _tag: "Stored" } | NotProvisioned> {
    if (!this.provisioned()) return { _tag: "NotProvisioned" };
    await this.#vault().put(name, value);
    return { _tag: "Stored" };
  }

  async secrets(): Promise<readonly SecretInfo[]> {
    return this.provisioned() ? this.#vault().list() : [];
  }

  async addModelKey(input: AddKey): Promise<AddResult | NotProvisioned> {
    return this.provisioned() ? this.#models().addKey(input) : { _tag: "NotProvisioned" };
  }

  async addModelEndpoint(input: AddEndpoint): Promise<AddResult | NotProvisioned> {
    return this.provisioned() ? this.#models().addEndpoint(input) : { _tag: "NotProvisioned" };
  }

  async startChatGpt(): Promise<{ readonly _tag: "SignIn"; readonly authorizeUrl: string } | NotProvisioned> {
    return this.provisioned() ? { _tag: "SignIn", authorizeUrl: await this.#models().startChatGpt() } : { _tag: "NotProvisioned" };
  }

  async finishChatGpt(redirectUrl: string): Promise<AddResult | NotProvisioned> {
    if (!this.provisioned()) return { _tag: "NotProvisioned" };
    const models = this.#models();
    const result = await models.finishChatGpt(redirectUrl);
    await this.#schedule(models.nextRefresh());
    return result;
  }

  /** The object's one alarm: refresh sign-ins before they expire. */
  override async alarm(): Promise<void> {
    if (!this.provisioned()) return;
    await this.#schedule(await this.#models().refreshDue());
  }

  async #schedule(at: number | undefined): Promise<void> {
    if (at === undefined) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(at, this.dependencies.clock.now()));
  }

  async modelConnections(): Promise<readonly ModelConnection[]> {
    return this.provisioned() ? this.#models().list() : [];
  }

  async modelReadiness(): Promise<Readiness> {
    return this.#models().readiness();
  }

  async modelRoute(wanted?: ModelPick): Promise<ModelRoute> {
    return this.#models().route(wanted);
  }

  async modelCall(call: ModelCall): Promise<Response> {
    return this.#models().forward(call);
  }

  /** What the Settings screens change, over this object's vault, connections, sandboxes and account. */
  protected settingsPlace(): SettingsPlace | undefined {
    const profile = readProfile(this.ctx.storage.sql);
    if (profile === undefined) return undefined;
    return settingsPlace({
      sql: this.ctx.storage.sql,
      dependencies: this.dependencies,
      profile,
      vault: this.#vault(),
      models: this.#models(),
      sandboxes: this.sandboxes(),
      account: this.account(profile),
    });
  }

  protected provisioned(): boolean {
    return readProfile(this.ctx.storage.sql) !== undefined;
  }

  /** Environments and commands: secrets reach a sandbox only through the vault's `use`. */
  protected sandboxes(): Sandboxes {
    const { sql } = this.ctx.storage;
    const { sandboxes: host, clock, ids } = this.dependencies;
    const agents = () => agentEnvironments(sql);
    return openSandboxes({ sql, host, secrets: this.#vault(), clock, ids, agents, building: this.#building, turns: this.#turns });
  }

  /** What the workspace pays. */
  protected account(profile: WorkspaceProfile): Account {
    const { billing, clock } = this.dependencies;
    return openAccount({ sql: this.ctx.storage.sql, billing, clock, workspaceId: profile.workspaceId, since: profile.createdAt });
  }

  #models(): Models {
    const { clock, ids, fetch } = this.dependencies;
    const { sql } = this.ctx.storage;
    return openModels({ sql, vault: this.#vault(), clock, ids, fetch, defaultPick: () => defaultModelOf(sql) });
  }

  /** Opened per call: the vault keeps no key and no value between calls. */
  #vault(): Vault {
    const { sql } = this.ctx.storage;
    return openVault({
      sql,
      masterKeys: this.dependencies.masterKeys,
      clock: this.dependencies.clock,
      audit: (line) => appendAudit(sql, { at: line.at, action: `secret.${line.action}`, subject: line.name }),
    });
  }
}
