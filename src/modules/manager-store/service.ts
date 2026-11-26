import { DurableObject } from "cloudflare:workers";
import { migrate, pushVersion, readRecord, versionAt, versionsOf, writeRecord } from "./internal/tables.ts";
import type { ManagerRecord, ManagerStoreApi, ManagerStores, OpenManager, Opened } from "./types.ts";
import type { Region } from "~/modules/workspace/types.ts";
import type { Files, Version } from "~/modules/playbook/types.ts";

/** One manager's object. The composition root subclasses it, so that a later dependency (a clock, a box host) is given and not reached for. */
export class ManagerStoreHost<Env = unknown> extends DurableObject<Env> implements ManagerStoreApi {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => migrate(ctx.storage.sql));
  }

  async open(input: OpenManager): Promise<Opened> {
    const { sql } = this.ctx.storage;
    if (readRecord(sql) !== undefined) return { _tag: "AlreadyOpen" };
    const { files, ...record } = input;
    this.ctx.storage.transactionSync(() => {
      writeRecord(sql, record);
      pushVersion(sql, { files, by: record.by, at: record.at, says: "Made from the template", from: "made" });
    });
    return { _tag: "Opened" };
  }

  async head(): Promise<ManagerRecord | undefined> {
    return readRecord(this.ctx.storage.sql);
  }

  async versions(): Promise<readonly Version[]> {
    return versionsOf(this.ctx.storage.sql);
  }

  async version(number?: number): Promise<Version | undefined> {
    return versionAt(this.ctx.storage.sql, number);
  }

  async copy(): Promise<{ readonly template: ManagerRecord["template"]; readonly given: Files; readonly now: Files } | undefined> {
    const { sql } = this.ctx.storage;
    const [record, first, now] = [readRecord(sql), versionAt(sql, 1), versionAt(sql)];
    return record === undefined || first === undefined || now === undefined
      ? undefined
      : { template: record.template, given: first.files, now: now.files };
  }

  async save(input: {
    readonly files: Files;
    readonly by: string;
    readonly at: number;
    readonly says: string;
    readonly from: Version["from"];
  }): Promise<Version> {
    return pushVersion(this.ctx.storage.sql, input);
  }
}

/** The namespace, as far as this module uses it. */
export interface ManagerStoreNamespace {
  jurisdiction(name: Region): {
    newUniqueId(): DurableObjectId;
    idFromString(id: string): DurableObjectId;
    get(id: DurableObjectId): ManagerStoreApi;
  };
}

/** Each manager's object is made in its workspace's jurisdiction. */
export const durableManagerStores = (namespace: ManagerStoreNamespace): ManagerStores => ({
  mint: (region) => {
    const place = namespace.jurisdiction(region);
    const id = place.newUniqueId();
    return { objectId: id.toString(), store: place.get(id) };
  },
  get: (objectId, region) => {
    const place = namespace.jurisdiction(region);
    return place.get(place.idFromString(objectId));
  },
});
