import { DurableObject } from "cloudflare:workers";
import { createBoxes } from "~/modules/boxes/service.ts";
import type { BoxHost } from "~/modules/boxes/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Files, Playbook, Version } from "~/modules/playbook/types.ts";
import { clonePlace, createWorking } from "~/modules/working/service.ts";
import type { Answer, AdoptInput, Changed, Outside, TakeInput, Working } from "~/modules/working/types.ts";
import type { WorkEvent } from "~/modules/work/types.ts";
import type { Region } from "~/modules/workspace/types.ts";
import { migrate, pushVersion, readRecord, versionAt, versionsOf, writeRecord } from "./internal/tables.ts";
import { workStore } from "./internal/work-tables.ts";
import { usageOf } from "./internal/usage.ts";
import type { Ask } from "~/modules/asks/types.ts";
import type { BoardRow, Hearing, ManagerRecord, ManagerStoreApi, ManagerStores, OpenManager, Opened, UsageRow, WorkRow } from "./types.ts";

const DAY = 86_400_000;

/** What a manager's object is given: time, containers, and what is outside it, built once its workspace is known. */
export interface ManagerStoreDeps {
  readonly clock: Clock;
  readonly host: BoxHost;
  readonly outside: (record: ManagerRecord) => Outside;
  readonly report: (message: string, error: unknown) => void;
}

/** One manager's object. The composition root subclasses it, so that what it needs is given and not reached for. */
export class ManagerStoreHost<Env = unknown> extends DurableObject<Env> implements ManagerStoreApi {
  readonly #deps: ManagerStoreDeps;
  #working: Working | undefined;
  readonly #playbooks = new Map<number, Playbook>();

  constructor(ctx: DurableObjectState, env: Env, deps: ManagerStoreDeps) {
    super(ctx, env);
    this.#deps = deps;
    // Work that a lost object left goes on as soon as it is back, and its tables are there.
    void ctx.blockConcurrencyWhile(async () => migrate(ctx.storage.sql)).then(() => this.#resume());
  }

  /** The playbook as it was at a version, read once. A version that does not read is none. */
  #playbookAt(number: number): Playbook | undefined {
    const known = this.#playbooks.get(number);
    if (known !== undefined) return known;
    const version = versionAt(this.ctx.storage.sql, number);
    const read = version === undefined ? undefined : playbooks.read(version.files);
    if (read?._tag !== "Playbook") return undefined;
    this.#playbooks.set(number, read.playbook);
    return read.playbook;
  }

  #arm(at: number | null): void {
    const { storage } = this.ctx;
    const set = at === null ? storage.deleteAlarm() : storage.setAlarm(Date.now() + Math.max(at - this.#deps.clock.now(), 0));
    set.catch((error: unknown) => this.#deps.report("A manager could not set its alarm", error));
  }

  /** What the manager does with its work, once it is made. */
  #works(): Working | undefined {
    if (this.#working !== undefined) return this.#working;
    const record = readRecord(this.ctx.storage.sql);
    if (record === undefined) return undefined;
    const { clock, host } = this.#deps;
    const store = workStore(this.ctx.storage);
    const outside = this.#deps.outside(record);
    const boxes = createBoxes({ sql: this.ctx.storage.sql, host, clock, place: clonePlace(outside, store) });
    this.#working = createWorking({
      store,
      boxes,
      outside,
      clock,
      playbook: (number) => this.#playbookAt(number),
      manager: { id: record.id, name: record.name },
      alarm: (at) => this.#arm(at),
      later: (running) => this.ctx.waitUntil(running.catch((error: unknown) => this.#deps.report("A manager's work stopped", error))),
    });
    return this.#working;
  }

  async #resume(): Promise<void> {
    try {
      await this.#works()?.run();
    } catch (error) {
      this.#deps.report("A manager could not go on with its work", error);
    }
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

  async hearing(): Promise<Hearing | undefined> {
    const { sql } = this.ctx.storage;
    const [record, version, working] = [readRecord(sql), versionAt(sql), this.#works()];
    if (record === undefined || version === undefined || working === undefined) return undefined;
    const today = Math.floor(this.#deps.clock.now() / DAY) * DAY;
    const spent = workStore(this.ctx.storage)
      .spends()
      .filter(({ at }) => at >= today)
      .reduce((sum, { dollars }) => sum + (dollars ?? 0), 0);
    return { record, version, open: working.open(), spent };
  }

  async take(
    input: TakeInput,
  ): Promise<{ readonly work: string } | { readonly _tag: "NeverOpened" } | { readonly _tag: "NoSuchKind"; readonly why: string }> {
    const working = this.#works();
    return working === undefined ? { _tag: "NeverOpened" } : working.take(input);
  }

  async heard(input: { readonly work: string; readonly item: TakeInput["item"] }): Promise<void> {
    await this.#works()?.heard(input);
  }

  async news(input: { readonly work: string; readonly event: WorkEvent; readonly says?: string }): Promise<void> {
    await this.#works()?.news(input);
  }

  async answered(input: Answer): Promise<void> {
    await this.#works()?.answered(input);
  }

  async event(work: string, event: WorkEvent): Promise<Changed> {
    const working = this.#works();
    return working === undefined ? { _tag: "Gone" } : working.event(work, event);
  }

  async adopt(
    input: AdoptInput,
  ): Promise<{ readonly work: string } | { readonly _tag: "NeverOpened" } | { readonly _tag: "NoSuchKind"; readonly why: string }> {
    const working = this.#works();
    return working === undefined ? { _tag: "NeverOpened" } : working.adopt(input);
  }

  async board(): Promise<readonly BoardRow[]> {
    const store = workStore(this.ctx.storage);
    return store
      .works()
      .map((work) => ({ work, hold: store.hold(work.id) ?? null, cost: store.spendOf(work.id), threads: store.threadsOf(work.id) }));
  }

  async work(id: string): Promise<WorkRow | undefined> {
    const store = workStore(this.ctx.storage);
    const work = store.work(id);
    return work === undefined
      ? undefined
      : { work, hold: store.hold(id) ?? null, cost: store.spendOf(id), threads: store.threadsOf(id), activity: store.activityOf(id) };
  }

  async asks(): Promise<readonly Ask[]> {
    return workStore(this.ctx.storage).asks();
  }

  async usage(): Promise<readonly UsageRow[]> {
    return usageOf(workStore(this.ctx.storage).spends());
  }

  async tick(): Promise<void> {
    await this.#works()?.due();
  }

  async keep(kind: string, id: string, value: unknown): Promise<void> {
    workStore(this.ctx.storage).keep(kind, id, value);
  }

  async kept(kind: string): Promise<readonly unknown[]> {
    return workStore(this.ctx.storage).kept(kind);
  }

  async destroy(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  override async alarm(): Promise<void> {
    try {
      await this.#works()?.due();
    } catch (error) {
      this.#deps.report("A manager's alarm could not finish", error);
    }
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
