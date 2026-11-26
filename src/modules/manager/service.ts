import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { ConversationId, TaskId } from "@earendil-works/pi-durable";
import type { CallResult } from "~/modules/actions/types.ts";
import { DurableObject } from "cloudflare:workers";
import { attributedText, AuthoredEntry } from "~/modules/transcript/service.ts";
import { AnswerSignal } from "./internal/asking.ts";
import { type Engine, openEngine } from "./internal/engine.ts";
import { flushAudit, hasPending } from "./internal/outbox.ts";
import { decisionsOf, HeardDoc, hear } from "./internal/heard.ts";
import { modelNoticeOf } from "./internal/launch.ts";
import { linesOf } from "./internal/partial.ts";
import { flushSends } from "./internal/sends.ts";
import type { Trigger } from "~/modules/triggers/types.ts";
import { press } from "./internal/person.ts";
import { BoardDoc, PagesDoc, PermissionsDoc, ProfileDoc } from "./internal/state.ts";
import { readdress } from "./internal/readdress.ts";
import { permissionsView, runsBetween, searchManager, taskDetail } from "./internal/task-detail.ts";
import type { SearchHit } from "~/modules/search/types.ts";
import { openQuestions, progressView } from "./internal/progress.ts";
import { boardView, pageViews, provisionOnce, runView } from "./internal/views.ts";
import type {
  Answer,
  BoardView,
  ChatLine,
  ChatResult,
  Brain,
  Heard,
  ManagerApi,
  ManagerDependencies,
  ManagerProfile,
  NotProvisioned,
  PageView,
  PersonCall,
  ProvisionResult,
  TriggerDecision,
  Waiter,
  ManagerWorkspace,
} from "./types.ts";

export { durableManagerObjects, type ManagerNamespace } from "./internal/objects.ts";
export { isTemplate } from "./internal/templates.ts";
export { templateCards } from "./internal/template-list.ts";

const NOT_PROVISIONED: NotProvisioned = { _tag: "NotProvisioned" };
const RETRY_MS = 30_000;

/**
 * One manager: its pi-durable harness (the manager's conversation and its Runs), its mission pages and its board, in
 * one Durable Object. The composition root subclasses it to pass the dependencies.
 */
export class ManagerHost<Env = unknown> extends DurableObject<Env> implements ManagerApi {
  protected readonly dependencies: ManagerDependencies;
  #engine: Promise<Engine> | undefined;
  #brain: Brain | undefined;

  constructor(ctx: DurableObjectState, env: Env, dependencies: ManagerDependencies) {
    super(ctx, env);
    this.dependencies = dependencies;
    // Work a lost process left goes on as soon as the object is back.
    void ctx.blockConcurrencyWhile(async () => {
      const engine = await this.#open();
      if ((await this.#profile(engine)) !== undefined) await engine.resume();
    });
  }

  /** The brain, made once. It reaches the workspace through the profile, which exists only after `provision`. */
  #thinking(): Brain {
    this.#brain ??= this.dependencies.brain(async () => {
      const profile = await this.#profile(await this.#open());
      return profile === undefined ? undefined : this.#workspace(profile);
    });
    return this.#brain;
  }

  #open(): Promise<Engine> {
    const { report } = this.dependencies;
    this.#engine ??= openEngine(
      this.ctx,
      this.#thinking(),
      { flush: () => void this.#flush(), workspace: (profile) => this.#workspace(profile), files: this.dependencies.files },
      report,
    );
    return this.#engine;
  }

  #workspace(profile: ManagerProfile): ManagerWorkspace {
    return this.dependencies.workspace(profile.workspaceObjectId, profile.region);
  }

  /** Sends queued audit lines to the workspace's log; the alarm retries what does not land. */
  async #flush(): Promise<void> {
    const engine = await this.#open();
    const profile = await this.#profile(engine);
    if (profile === undefined) return;
    const workspace = this.#workspace(profile);
    await flushAudit(engine.harness, workspace);
    const unsent = await flushSends(engine.harness, profile.managerId, this.dependencies.channel, workspace);
    if (unsent || (await hasPending(engine.harness))) await this.ctx.storage.setAlarm(this.dependencies.clock.now() + RETRY_MS);
  }

  async deliver(waiter: Waiter, answer: Answer): Promise<{ readonly _tag: "Delivered" } | { readonly _tag: "Gone" }> {
    const engine = await this.#open();
    await engine.expectWork();
    const result = await engine.harness.signal(waiter.taskId as TaskId, AnswerSignal, waiter.key, { ...answer }, BACKGROUND_CONTEXT);
    return result === "delivered" || result === "duplicate" ? { _tag: "Delivered" } : { _tag: "Gone" };
  }

  async act(call: PersonCall): Promise<CallResult | NotProvisioned> {
    const engine = await this.#open();
    const result = await press(engine, call, this.dependencies.clock.now, (profile) => this.#workspace(profile));
    void this.#flush();
    return result ?? NOT_PROVISIONED;
  }

  async task(taskId: string): ReturnType<ManagerApi["task"]> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    const board = await engine.harness.snapshot(BoardDoc, BACKGROUND_CONTEXT);
    const detail = board === undefined ? undefined : taskDetail(board, taskId);
    return detail === undefined ? { _tag: "NoSuchTask" } : { _tag: "Task", detail };
  }

  async permissions(): ReturnType<ManagerApi["permissions"]> {
    const engine = await this.#open();
    const [profile, own] = [await this.#profile(engine), await engine.harness.snapshot(PermissionsDoc, BACKGROUND_CONTEXT)];
    return profile === undefined || own === undefined
      ? NOT_PROVISIONED
      : { _tag: "Permissions", permissions: permissionsView(own, profile.template) };
  }

  async readdress(address: string): Promise<{ readonly _tag: "Readdressed" } | NotProvisioned> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    await readdress(engine.harness, address);
    return { _tag: "Readdressed" };
  }

  async runCount(since: number, until?: number): Promise<number> {
    const board = await (await this.#open()).harness.snapshot(BoardDoc, BACKGROUND_CONTEXT);
    return board === undefined ? 0 : runsBetween(board, since, until);
  }

  async #profile(engine: Engine): Promise<ManagerProfile | undefined> {
    return (await engine.harness.snapshot(ProfileDoc, BACKGROUND_CONTEXT))?.profile;
  }

  async provision(profile: ManagerProfile): Promise<ProvisionResult> {
    const engine = await this.#open();
    const existing = await this.#profile(engine);
    if (existing !== undefined) return { _tag: "AlreadyProvisioned", managerId: existing.managerId };
    // A manager that could not answer is not started: the person is told why, here, instead of by a silent chat.
    const unready = await this.#thinking().ready?.(this.#workspace(profile));
    if (unready !== undefined) return unready;
    return engine.harness.commit((tx) => provisionOnce(tx, profile), BACKGROUND_CONTEXT);
  }

  async describe(): Promise<{ readonly _tag: "Found"; readonly profile: ManagerProfile } | NotProvisioned> {
    const profile = await this.#profile(await this.#open());
    return profile === undefined ? NOT_PROVISIONED : { _tag: "Found", profile };
  }

  async chat({ text, by, requestId }: Parameters<ManagerApi["chat"]>[0]): Promise<ChatResult> {
    const engine = await this.#open();
    const profile = await this.#profile(engine);
    if (profile === undefined) return NOT_PROVISIONED;
    await engine.expectWork();
    const root = await engine.harness.root(BACKGROUND_CONTEXT);
    const submission = await root.submit(
      {
        type: "input",
        content: attributedText(by, text),
        entry: { kind: AuthoredEntry.kind, data: { author: { id: by.id, name: by.name } } },
        requestId,
        whenBusy: "followUp",
      },
      BACKGROUND_CONTEXT,
    );
    const notice = await modelNoticeOf(this.#workspace(profile));
    return { _tag: "Accepted", submissionId: String(submission.id), ...(notice === undefined ? {} : { notice }) };
  }

  async conversation(): Promise<readonly ChatLine[] | NotProvisioned> {
    const engine = await this.#open();
    const profile = await this.#profile(engine);
    if (profile === undefined) return NOT_PROVISIONED;
    const root = await engine.harness.root(BACKGROUND_CONTEXT);
    return linesOf(engine.harness, root.id, profile.managerId);
  }

  async board(): Promise<BoardView | NotProvisioned> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    const board = await engine.harness.snapshot(BoardDoc, BACKGROUND_CONTEXT);
    return board === undefined ? NOT_PROVISIONED : boardView(board);
  }

  async progress(): ReturnType<ManagerApi["progress"]> {
    const engine = await this.#open();
    const board = (await this.#profile(engine)) === undefined ? undefined : await engine.harness.snapshot(BoardDoc, BACKGROUND_CONTEXT);
    return board === undefined ? NOT_PROVISIONED : progressView(board, await openQuestions(engine.harness));
  }

  async run(runId: string): ReturnType<ManagerApi["run"]> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    const run = (await engine.harness.snapshot(BoardDoc, BACKGROUND_CONTEXT))?.runs[runId];
    if (run === undefined) return { _tag: "NoSuchRun" };
    return { _tag: "Run", run: runView(run), lines: await linesOf(engine.harness, run.conversationId as ConversationId) };
  }

  async pages(): Promise<readonly PageView[] | NotProvisioned> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    const pages = await engine.harness.snapshot(PagesDoc, BACKGROUND_CONTEXT);
    return pages === undefined ? NOT_PROVISIONED : pageViews(pages);
  }

  async search(query: string): Promise<readonly SearchHit[]> {
    const engine = await this.#open();
    const profile = await this.#profile(engine);
    return profile === undefined ? [] : searchManager(engine.harness, profile.managerId, query);
  }

  async decisions(): Promise<readonly TriggerDecision[]> {
    return decisionsOf(await (await this.#open()).harness.snapshot(HeardDoc, BACKGROUND_CONTEXT));
  }

  async hear(trigger: Trigger, routed: Heard): Promise<{ readonly _tag: "Heard" } | NotProvisioned> {
    const engine = await this.#open();
    if ((await this.#profile(engine)) === undefined) return NOT_PROVISIONED;
    await engine.expectWork();
    await hear(engine.harness, trigger, routed);
    return { _tag: "Heard" };
  }

  async destroy(): Promise<{ readonly _tag: "Destroyed" }> {
    const engine = await this.#engine;
    this.#engine = undefined;
    await engine?.close();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    return { _tag: "Destroyed" };
  }

  override async alarm(): Promise<void> {
    await (await this.#open()).resume();
    await this.#flush();
  }
}
