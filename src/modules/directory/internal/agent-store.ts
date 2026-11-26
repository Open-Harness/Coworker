import { and, desc, eq, isNull } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { AgentConfig, AgentRow, DeployedTo, Deployment } from "~/modules/agent-config/types.ts";
import { agents, agentVersions } from "./schema.ts";

type Stored = typeof agents.$inferSelect;
type StoredVersion = typeof agentVersions.$inferSelect;

export interface Saving {
  readonly id: string;
  readonly basedOn: number;
  readonly config: AgentConfig;
  readonly by: string;
  readonly requestId: string;
  readonly now: number;
}
export type Saved = { readonly kind: "saved"; readonly row: AgentRow } | { readonly kind: "conflict" | "deleted" };

function deploymentOf(stored: Stored, versions: readonly StoredVersion[]): Deployment | undefined {
  const { deployedVersion: version, deployedTo: to, deployedAt: at, deployedBy: by } = stored;
  if (version === null || to === null || at === null || by === null) return undefined;
  const config = versions.find((saved) => saved.version === version)?.config;
  return config === undefined ? undefined : { version, to, at, by, name: config.name, description: config.description };
}

function toRow(stored: Stored, versions: readonly StoredVersion[]): AgentRow | undefined {
  const latest = versions[0];
  if (latest === undefined) return undefined;
  const deployment = deploymentOf(stored, versions);
  return {
    id: stored.id,
    config: latest.config,
    version: latest.version,
    versions: versions.map(({ version, savedAt, savedBy }) => ({ version, savedAt, savedBy })),
    createdAt: stored.createdAt,
    createdBy: stored.createdBy,
    ...(deployment === undefined ? {} : { deployment }),
  };
}

/** Agents, every version ever saved of each, and which one people use. Versions never change. */
export class AgentStore {
  readonly #db: DrizzleSqliteDODatabase;

  constructor(db: DrizzleSqliteDODatabase) {
    this.#db = db;
  }

  listed(): readonly AgentRow[] {
    const rows = this.#db.select().from(agents).where(isNull(agents.deletedAt)).orderBy(agents.createdAt).all();
    return rows.flatMap((stored) => toRow(stored, this.#versions(stored.id)) ?? []);
  }

  find(id: string): AgentRow | undefined {
    const stored = this.#live(id);
    return stored === undefined ? undefined : toRow(stored, this.#versions(id));
  }

  config(id: string, version: number): AgentConfig | undefined {
    return this.#live(id) === undefined ? undefined : this.#versions(id).find((saved) => saved.version === version)?.config;
  }

  save({ id, basedOn, config, by, requestId, now }: Saving): Saved {
    const stored = this.#db.select().from(agents).where(eq(agents.id, id)).get();
    if (stored !== undefined && stored.deletedAt !== null) return { kind: "deleted" };
    const isRepeated = this.#versions(id).some((saved) => saved.requestId === requestId);
    if (!isRepeated) {
      if ((stored?.version ?? 0) !== basedOn) return { kind: "conflict" };
      const version = basedOn + 1;
      this.#db.insert(agentVersions).values({ agentId: id, version, config, savedAt: now, savedBy: by, requestId }).run();
      this.#db
        .insert(agents)
        .values({ id, version, createdAt: now, createdBy: by })
        .onConflictDoUpdate({ target: agents.id, set: { version } })
        .run();
    }
    const row = this.find(id);
    return row === undefined ? { kind: "deleted" } : { kind: "saved", row };
  }

  deploy(id: string, version: number, to: DeployedTo, by: string, now: number): AgentRow | undefined {
    if (this.config(id, version) === undefined) return undefined;
    this.#update(id, { deployedVersion: version, deployedTo: to, deployedAt: now, deployedBy: by });
    return this.find(id);
  }

  retire(id: string): AgentRow | undefined {
    this.#update(id, { deployedVersion: null, deployedTo: null, deployedAt: null, deployedBy: null });
    return this.find(id);
  }

  remove(id: string, now: number): void {
    this.#update(id, { deletedAt: now });
  }

  #update(id: string, change: Partial<Stored>): void {
    this.#db
      .update(agents)
      .set(change)
      .where(and(eq(agents.id, id), isNull(agents.deletedAt)))
      .run();
  }

  #live(id: string): Stored | undefined {
    return this.#db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), isNull(agents.deletedAt)))
      .get();
  }

  #versions(id: string): readonly StoredVersion[] {
    return this.#db.select().from(agentVersions).where(eq(agentVersions.agentId, id)).orderBy(desc(agentVersions.version)).all();
  }
}
