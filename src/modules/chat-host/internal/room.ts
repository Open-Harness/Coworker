import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { type CommitPublication, type Harness, type TaskGraph } from "@earendil-works/pi-durable";
import type { Agent } from "~/modules/agent/types.ts";
import { chats } from "~/modules/chats/service.ts";
import { documents } from "~/modules/documents/service.ts";
import { PROTOCOL_VERSION } from "~/modules/protocol/service.ts";
import type { WorkspaceState } from "~/modules/protocol/types.ts";
import { listSchedules } from "~/modules/schedule/service.ts";
import type { Projection, Registration, Report, WorkspaceDependencies } from "../types.ts";
import { changedSlices, type Slice } from "./changes.ts";
import type { Connections } from "./connections.ts";
import { Projector } from "./projector.ts";
import { Statuses } from "./status.ts";

/** Pages are told about a burst of commits once. */
const FLUSH_MS = 30;

/** The workspace's state beside the open chats: keeps pages and the directory current as the engine commits. */
export class Room {
  readonly #statuses = new Statuses();
  readonly #pending = new Set<Slice>();
  readonly #projector: Projector;
  #flush: ReturnType<typeof setTimeout> | undefined;
  #sequence = Date.now();
  #activity: TaskGraph = { tasks: {} };

  private constructor(
    readonly harness: Harness,
    readonly agent: Agent,
    readonly connections: Connections,
    readonly report: Report,
    public registration: Registration,
    directory: WorkspaceDependencies["directory"],
  ) {
    this.#projector = new Projector(directory, report, () => this.#projection());
  }

  static async open(
    harness: Harness,
    connections: Connections,
    registration: Registration,
    { agent, directory, report }: WorkspaceDependencies,
  ): Promise<Room> {
    const room = new Room(harness, agent, connections, report, registration, directory);
    const listed = await harness.commit((tx) => chats.list(tx), BACKGROUND_CONTEXT);
    await room.#statuses.load(
      harness,
      listed.map(({ id }) => id),
    );
    harness.observeCommits({ advance: (publication) => room.#follow(publication), end: () => {} });
    const activity = await harness.observeTaskGraph(
      { advance: (call) => call.kind === "value" && room.#showActivity(call.value), end: () => {} },
      BACKGROUND_CONTEXT,
    );
    room.#activity = activity.value;
    return room;
  }

  /** Brings the directory up to date. */
  publish(): Promise<void> {
    return this.#projector.publish();
  }

  async sendSnapshot(socket: WebSocket): Promise<void> {
    const me = this.connections.state(socket)?.person;
    if (me === undefined) return;
    this.connections.send(socket, {
      type: "workspace.snapshot",
      protocol: PROTOCOL_VERSION,
      workspaceId: this.registration.workspaceId,
      me,
      models: this.agent.models,
      state: await this.#state(),
    });
  }

  showPresence(): void {
    this.connections.broadcast({ type: "workspace.patch", patch: { presence: this.connections.presence() } });
  }

  rename(registration: Registration): void {
    this.registration = registration;
    this.connections.broadcast({ type: "workspace.patch", patch: { name: registration.name } });
  }

  async #state(): Promise<WorkspaceState> {
    const [settings, usage, listed, schedules] = await Promise.all([
      this.agent.settings(this.harness, BACKGROUND_CONTEXT),
      this.agent.usage(this.harness, BACKGROUND_CONTEXT),
      documents.list(this.harness, BACKGROUND_CONTEXT),
      listSchedules(this.harness, BACKGROUND_CONTEXT),
    ]);
    return {
      name: this.registration.name,
      settings,
      usage,
      documents: listed,
      schedules,
      activity: this.#activity,
      presence: this.connections.presence(),
    };
  }

  async #projection(): Promise<Projection> {
    const [listed, rows] = await Promise.all([
      this.harness.commit((tx) => chats.list(tx), BACKGROUND_CONTEXT),
      documents.list(this.harness, BACKGROUND_CONTEXT),
    ]);
    // Wall-clock based, so it also grows across restarts of the object.
    this.#sequence = Math.max(this.#sequence + 1, Date.now());
    return {
      workspaceId: this.registration.workspaceId,
      sequence: this.#sequence,
      chats: listed.map((chat) => ({ ...chat, status: this.#statuses.of(chat.id) })),
      documents: rows,
    };
  }

  #follow(publication: CommitPublication): void {
    for (const slice of changedSlices(publication)) this.#pending.add(slice);
    if (this.#statuses.follow(publication)) this.#pending.add("chats");
    if (this.#pending.size > 0) this.#schedule();
  }

  #showActivity(activity: TaskGraph): void {
    this.#activity = activity;
    this.connections.broadcast({ type: "workspace.patch", patch: { activity } });
  }

  #schedule(): void {
    if (this.#flush !== undefined) return;
    this.#flush = setTimeout(() => {
      this.#flush = undefined;
      void this.#showPending().catch((error: unknown) => this.report("Pages were not updated", error));
    }, FLUSH_MS);
  }

  async #showPending(): Promise<void> {
    const slices = new Set(this.#pending);
    this.#pending.clear();
    if (slices.has("chats") || slices.has("documents")) void this.publish();
    const context = BACKGROUND_CONTEXT;
    const patch: Partial<WorkspaceState> = {
      ...(slices.has("settings") ? { settings: await this.agent.settings(this.harness, context) } : {}),
      ...(slices.has("usage") ? { usage: await this.agent.usage(this.harness, context) } : {}),
      ...(slices.has("documents") ? { documents: await documents.list(this.harness, context) } : {}),
      ...(slices.has("schedules") ? { schedules: await listSchedules(this.harness, context) } : {}),
    };
    if (Object.keys(patch).length > 0) this.connections.broadcast({ type: "workspace.patch", patch });
  }
}
