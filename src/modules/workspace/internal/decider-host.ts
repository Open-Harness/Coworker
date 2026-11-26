import type { AskAnswer, AskOp, Asking } from "~/modules/asking/types.ts";
import type { Item } from "~/modules/intake/types.ts";
import type { NotProvisioned } from "../types.ts";
import { askingOf } from "./asks-host.ts";
import { runStore } from "./console-store.ts";
import { decidingOf } from "./deciding-host.ts";
import { followingOf } from "./following-host.ts";
import { SettingsHost } from "./settings-host.ts";

/** What came in is decided from the object's alarm, so that an object that was lost decides it when it is back. */
export abstract class DecidingHost<Env> extends SettingsHost<Env> {
  #asking: Asking | undefined;
  /** One decision run at a time: a second wake-up while one is going asks for another after it, never for two at once. */
  #deciding: Promise<number | null> | undefined;
  #again = false;

  /** What waits for a person, over this workspace's rows. */
  protected asking(): Asking {
    return (this.#asking ??= askingOf(this.ctx.storage.sql, this.dependencies));
  }

  /** The one door of asking: from a manager (it asks), from the console (the inbox, an answer). */
  async asked(op: AskOp): Promise<AskAnswer | NotProvisioned> {
    if (!this.provisioned()) return { _tag: "NotProvisioned" };
    const answer = await this.asking().handle(op);
    if (op.op === "open" || op.op === "answer") await this.askTick();
    return answer;
  }

  /** What is due of what waits for a person is done, and the object wakes for what is due next. */
  protected async askTick(): Promise<void> {
    const next = await this.asking().tick();
    if (next !== null) await this.wakeFor(next - this.dependencies.clock.now());
  }

  /** Wakes the object in `after` milliseconds of the clock's time, unless it wakes sooner for something else. */
  protected async wakeFor(after: number): Promise<void> {
    const at = Date.now() + Math.max(after, 0);
    const set = await this.ctx.storage.getAlarm();
    if (set === null || set > at) await this.ctx.storage.setAlarm(at);
  }

  /** What is due now is done: what came in is decided, and what a judge did not answer is asked again. */
  async tick(): Promise<void> {
    if (!this.provisioned()) return;
    await this.decide();
    await this.askTick();
  }

  protected decide(): Promise<number | null> {
    if (this.#deciding !== undefined) {
      this.#again = true;
      return this.#deciding;
    }
    const running = this.#decideAll().finally(() => {
      this.#deciding = undefined;
    });
    this.#deciding = running;
    return running;
  }

  async #decideAll(): Promise<number | null> {
    let again = await this.#decideOnce();
    while (this.#again) {
      this.#again = false;
      again = await this.#decideOnce();
    }
    return again;
  }

  async #decideOnce(): Promise<number | null> {
    const deciding = decidingOf({
      answered: async (item) => this.#answered(item),
      sql: this.ctx.storage.sql,
      dependencies: this.dependencies,
      connections: () => this.modelConnections(),
      modelCall: (call) => this.modelCall(call),
    });
    const soon = (): { readonly again: number } => ({ again: this.dependencies.clock.now() + 30_000 });
    const decided = await deciding.run().catch(soon);
    // What became true of a conversation that work follows is told to that work, after what people said is decided.
    const followed = await followingOf(this.ctx.storage.sql, this.dependencies).run().catch(soon);
    const again = [decided.again, followed.again].reduce<number | null>(
      (least, one) => (one === null ? least : Math.min(least ?? one, one)),
      null,
    );
    if (again !== null) await this.wakeFor(again - this.dependencies.clock.now());
    return again;
  }

  /** A comment that says one of the options of an ask made on its thread answers it. */
  async #answered(item: Item): Promise<{ readonly ask: string; readonly work: string | null } | undefined> {
    const { actor } = item;
    return this.asking().heard({
      thread: item.thread,
      text: item.text,
      person: actor.person ?? null,
      name: actor.name,
      mayAct: actor.standing === "write" || actor.standing === "admin",
    });
  }

  /** The object's alarm: what came in is decided, then the sign-ins that are about to expire are refreshed; it wakes again for whatever is still owed. */
  override async alarm(): Promise<void> {
    if (!this.provisioned()) return;
    // The sign-ins first: it sets or clears the one alarm, and what is owed after it is set again by `decide`.
    await super.alarm();
    await this.decide();
    await this.askTick();
  }

  /** Whether every one of these managers is paused (or gone), so that nothing of what they hear needs a judge. */
  protected pausedAll(managers: readonly string[]): boolean {
    const rows = runStore(
      { sql: this.ctx.storage.sql, now: this.dependencies.clock.now(), id: this.dependencies.ids.next },
      { op: "manager.list" },
    );
    return (
      rows.op === "manager.list" && rows.rows.filter(({ node }) => managers.includes(node.id)).every(({ node }) => node.state !== "runs")
    );
  }

  /** The live socket: a page that was let in by the Worker hears which reads changed, and asks them again. */
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response(null, { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  override webSocketMessage(): void {
    // The page says nothing: it only listens.
  }

  /** Every page that is listening is told which reads changed. */
  protected tell(reads: readonly string[]): void {
    const said = JSON.stringify({ reads: [...new Set(reads)] });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(said);
      } catch {
        // A page that went away is not told.
      }
    }
  }
}
