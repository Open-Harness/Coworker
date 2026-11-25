/*
 * `coworker-fake-model`: a scripted OpenAI-compatible server, deployed as its own Worker and added to the staging test
 * workspace as its **own endpoint** (book section 2, "Models"), so the live tier also tests that path. No model is
 * behind it: what it says is a function of the conversation, written out in `internal/script.ts`.
 *
 *   GET  /v1/models              the two models it offers
 *   POST /v1/chat/completions    the next step of the script, streamed (`stream: true`) or whole
 *
 * It does what the fast tier's scripted manager does, so a manager on staging behaves the same:
 *   - a candidate from outside that is explicit is accepted (`triage_accept`), an inferred one is ignored;
 *   - a new Task is told where it came from (`reply_thread`), a follow-up is answered on its Task;
 *   - "add a task: <title>" is `task_create`; "start a <role> on DT-n [run: <command>]" is `run_start`;
 *   - a worker's run does `run: <command>` with `run_command` and reports its outcome (`ready` on exit 0, else `failed`,
 *     with the end of what it printed), or reports `ready` at once when it has no command;
 *   - anything else is acknowledged in words.
 */

export const MODELS = ["coworker-scripted-mini", "coworker-scripted-large"] as const;

export interface FakeModelSettings {
  /** The bearer key it accepts. Without one it accepts any request (staging is not secret, but it need not be open). */
  readonly key?: string | undefined;
}

export interface FakeModel {
  readonly handle: (request: Request, settings: FakeModelSettings) => Promise<Response>;
}

/** What the script does next. Pure: the same conversation always gives the same step. */
export type Step =
  | { readonly kind: "call"; readonly tool: string; readonly args: Readonly<Record<string, unknown>> }
  | { readonly kind: "say"; readonly text: string };

/** One message of a chat request, reduced to what the script reads. */
export interface Turn {
  readonly role: string;
  readonly text: string;
  /** For a tool's result: the name of the tool that was called. */
  readonly tool?: string;
}
