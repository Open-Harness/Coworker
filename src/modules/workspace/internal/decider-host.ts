import { runStore } from "./console-store.ts";
import { decidingOf } from "./deciding-host.ts";
import { SettingsHost } from "./settings-host.ts";

/** What came in is decided from the object's alarm, so that an object that was lost decides it when it is back. */
export abstract class DecidingHost<Env> extends SettingsHost<Env> {
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
  }

  protected async decide(): Promise<number | null> {
    const deciding = decidingOf({
      sql: this.ctx.storage.sql,
      dependencies: this.dependencies,
      connections: () => this.modelConnections(),
      modelCall: (call) => this.modelCall(call),
    });
    const { again } = await deciding.run().catch(() => ({ again: this.dependencies.clock.now() + 30_000 }));
    if (again !== null) await this.wakeFor(again - this.dependencies.clock.now());
    return again;
  }

  /** The object's alarm: what came in is decided, then the sign-ins that are about to expire are refreshed; it wakes again for whatever is still owed. */
  override async alarm(): Promise<void> {
    if (!this.provisioned()) return;
    // The sign-ins first: it sets or clears the one alarm, and what is owed after it is set again by `decide`.
    await super.alarm();
    await this.decide();
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
