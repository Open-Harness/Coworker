import { threads } from "~/modules/threads/service.ts";
import { connectors } from "~/modules/connectors/service.ts";
import { answeredOf, askIdOf, DAY, openAsk, optionsOf, saidOf, type Spec, waitsFor } from "../asking.ts";
import { threadKey } from "../take.ts";
import { pullOf } from "./github.ts";
import { type Call, said, type Tool, type Result, wrong } from "../tool.ts";

/*
 * What an agent does that waits for a person: it asks, or it calls an action that is set to ask. The call is parked at the ask: the thread stops
 * where it is, and when it is answered it goes on from the same call, which then says what the answer was (or does what was said yes to).
 */

/** Asked again with the same call finds the ask that is there: so a thread that goes on from a lost object asks nothing twice. */
const idOfCall = (call: Call): string => askIdOf(`call:${call.id}`);

async function park(call: Call, spec: Spec): Promise<Result> {
  const opened = await openAsk(call.c, call.work, spec);
  if (opened._tag === "Held") return { _tag: "Waits", why: opened.why };
  if (opened._tag === "Refused") return wrong(opened.why);
  waitsFor(call.c, call.work, spec);
  return { _tag: "Parks" };
}

/** The question of an agent, to who answers for the work. Its answer is what the call says. */
export async function ask(call: Call, args: unknown): Promise<Result> {
  const read = threads.read("ask", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const id = idOfCall(call);
  const answer = answeredOf(call.c, id);
  if (answer !== undefined) return said(saidOf(answer));
  const { manager } = call.c;
  const options = optionsOf(read.args.options ?? [], (label) => `${manager.name} goes on with: ${label}.`);
  const best = options.find(({ id: one, label }) => one === read.args.best || label.toLowerCase() === read.args.best?.toLowerCase());
  return park(call, {
    id,
    person: call.work.answers,
    need: "decide",
    question: read.args.question,
    why: `${manager.name} asked while working on "${call.work.title}".`,
    options,
    best: best?.id ?? null,
    shows: null,
    by: call.c.clock.now() + DAY,
    parked: { kind: "tool", thread: call.thread.id },
  });
}

/** What an action is done to: the pull request, for what is done to one and the work has one; else the conversation it came from. */
function whereOf(call: Call, action: string): string {
  const pull = /^github\.(merge|update_pull_request|reply_on_line|rebase|rerun_checks)$/u.test(action) ? pullOf(call) : undefined;
  return pull === undefined ? threadKey(call.work.from) : `github:${call.work.from.place}#${pull}`;
}

/** What the action will do, in the words it is done in: what it says it does, and each thing it is given. */
function showsOf(call: Call, action: string, args: unknown): Spec["shows"] {
  const does = connectors.all.flatMap((one) => one.actions).find((one) => one.id === action)?.does ?? action;
  const given = typeof args === "object" && args !== null ? Object.entries(args as Record<string, unknown>) : [];
  const lines = given.map(([name, value]) => `${name}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  return { action, where: whereOf(call, action), text: [does, ...lines].join("\n") };
}

/** What a person said to an action that waited for them: a yes does it, and either is a line in the audit log with who said it. */
async function answered(call: Call, action: string, args: unknown, answer: NonNullable<ReturnType<typeof answeredOf>>, tool: Tool): Promise<Result> {
  const yes = answer.option === "yes";
  const result = yes ? await tool.run(call, args) : wrong(`${saidOf(answer)} It was not done.`);
  const shows = showsOf(call, action, args);
  const outcome = !yes ? "refused" : result._tag === "Said" && !result.ok ? "failed" : "done";
  const line = shows?.text.split("\n")[0] ?? action;
  // Once, however often the thread goes on from this call.
  const key = `audited:${idOfCall(call)}`;
  if (call.c.store.once(key) !== undefined) return result;
  call.c.store.keepOnce(key, "yes");
  await call.c.outside.audit?.({
    at: call.c.clock.now(),
    says: `${call.c.manager.name}: ${line.replace(/\.$/u, "")} on ${shows?.where ?? ""}`,
    action,
    outcome,
    why: result._tag === "Said" && !result.ok ? result.text : null,
    approvedBy: answer.person,
  });
  return result;
}

/** An action that is set to ask: a person says yes first, once, or "always" for this thread, this person or this kind. A no is told to the agent. */
export function guarded(tool: Tool, action: string): Tool {
  const run = async (call: Call, args: unknown): Promise<Result> => {
    const id = idOfCall(call);
    const answer = answeredOf(call.c, id);
    if (answer !== undefined) return answered(call, action, args, answer, tool);
    if (call.c.store.once(`asked:${id}`) === undefined) {
      const use = { action, thread: threadKey(call.work.from), person: call.work.asked, kind: call.work.kind };
      const covered = await call.c.outside.asks({ op: "covered", use });
      if (covered.op === "covered" && covered.is) return tool.run(call, args);
    }
    const { manager } = call.c;
    const shows = showsOf(call, action, args);
    return park(call, {
      id,
      person: call.work.answers,
      need: "approve",
      question: `${manager.name} wants to do this on "${call.work.title}". May it?`,
      why: `${action} is set to ask before it is done.`,
      options: [
        { id: "yes", label: "Yes, do it", then: `${manager.name} does it, and goes on.` },
        { id: "no", label: "No", then: `${manager.name} does not do it, and goes on.` },
      ],
      best: null,
      shows,
      by: call.c.clock.now() + DAY,
      parked: { kind: "tool", thread: call.thread.id },
    });
  };
  return { ...tool, description: `${tool.description} A person is asked before it is done.`, run };
}
