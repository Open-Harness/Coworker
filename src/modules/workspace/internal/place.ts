import type { Account } from "~/modules/billing/types.ts";
import type { Models } from "~/modules/models/types.ts";
import type { Sandboxes } from "~/modules/sandboxes/types.ts";
import type { SettingsPlace } from "~/modules/settings/types.ts";
import type { Vault } from "~/modules/vault/types.ts";
import type { WorkspaceDependencies, WorkspaceProfile } from "../types.ts";
import { queryAudit } from "./audit.ts";
import { connection } from "./github.ts";
import { recordActions, notify } from "./inbox.ts";
import { readJoinSettings } from "./joining.ts";
import { addressFor, listManagers } from "./managers.ts";
import { readPolicy } from "./hearing.ts";
import { people } from "./people.ts";

/** What the settings module needs of this object, made from the pieces the object holds. */
export interface Pieces {
  readonly sql: SqlStorage;
  readonly dependencies: WorkspaceDependencies;
  readonly profile: WorkspaceProfile;
  readonly vault: Vault;
  readonly models: Models;
  readonly sandboxes: Sandboxes;
  readonly account: Account;
}

const MAX_EXPORTED_LINES = 20_000;

function allAudit(sql: SqlStorage) {
  const lines = [];
  for (let page = queryAudit(sql, {}); ; page = queryAudit(sql, { before: page.next ?? "" })) {
    lines.push(...page.entries);
    if (page.next === undefined || lines.length >= MAX_EXPORTED_LINES) return lines;
  }
}

/** The profile's name and address, and every manager's address, which is made of the workspace's. */
async function rename({ sql, dependencies, profile }: Pieces, name: string, address: string): Promise<void> {
  const { managers, mailDomain } = dependencies;
  for (const entry of listManagers(sql, profile)) {
    const next = addressFor(entry.slug, address, mailDomain);
    await managers.get(entry.objectId, entry.region).readdress(next);
    sql.exec("UPDATE manager SET address = ? WHERE manager_id = ?", next, entry.managerId);
  }
  sql.exec("UPDATE profile SET name = ?, address = ?", name, address);
}

export function settingsPlace(pieces: Pieces): SettingsPlace {
  const { sql, dependencies, profile, vault, models, sandboxes, account } = pieces;
  const { clock, ids, managers, mailer, sendFrom, mailDomain } = dependencies;
  return {
    sql,
    clock,
    ids,
    profile,
    mailDomain,
    vault,
    models,
    sandboxes,
    account,
    mailer,
    sendFrom,
    roster: listManagers(sql, profile),
    manager: (entry) => managers.get(entry.objectId, entry.region),
    audit: (record, managerId = "") => recordActions(sql, [{ key: `settings:${ids.next("set")}`, managerId, record }]),
    rename: (name, address) => rename(pieces, name, address),
    notice: (notice) => notify(sql, notice, clock.now()),
    ownerOf: (managerId) =>
      sql.exec<{ created_by: string }>("SELECT created_by FROM manager WHERE manager_id = ?", managerId).toArray()[0]?.created_by,
    extras: async () => {
      const { linkSecret: _secret, ...joining } = readJoinSettings(sql);
      return {
        people: people(sql),
        joining,
        github: connection(sql),
        policies: Object.fromEntries(listManagers(sql, profile).map((entry) => [entry.slug, readPolicy(sql, entry.managerId)])),
        audit: allAudit(sql),
      };
    },
  };
}
