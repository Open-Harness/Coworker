import type { Check } from "~/modules/playbook/types.ts";
import type { ToolArgs } from "../types.ts";
import { flag, listOf, maybeText, number01, oneOf, own, record, text, textList, texts, type Said } from "./fields.ts";

type Obj = Readonly<Record<string, unknown>>;
type Reader<T> = (from: Obj, said: Said) => T | undefined;

const byWho = ["command", "agent", "person", "connector"] as const;
const lookAt = ["work", "manager", "intake", "spending", "asks", "thread", "playbook"] as const;
const results = ["done", "no", "stuck"] as const;

/** Keys that were not given are not in what comes out. */
function without<T extends Record<string, unknown>>(made: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(made).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

function readCheck(one: Obj, path: string, said: Said): Check | undefined {
  const id = text(one, "id", path, said);
  const says = text(one, "says", path, said);
  const by = oneOf(one, "by", path, byWho, said);
  const run = maybeText(one, "run", path, said);
  return id === undefined || says === undefined || by === undefined ? undefined : without({ id, says, by, run });
}

function readEvidence(one: Obj, path: string, said: Said, extra: "link" | "at") {
  const check = text(one, "check", path, said);
  const met = flag(one, "met", path, said);
  const says = text(one, "says", path, said);
  const more = maybeText(one, extra, path, said);
  return check === undefined || met === undefined || says === undefined ? undefined : without({ check, met, says, [extra]: more });
}

const note: Reader<ToolArgs["note"]> = (from, said) => {
  const says = text(from, "says", "", said);
  return says === undefined ? undefined : { says };
};

const ask: Reader<ToolArgs["ask"]> = (from, said) => {
  const question = text(from, "question", "", said);
  const options = own(from, "options") === undefined ? undefined : textList(from, "options", "", said);
  const best = maybeText(from, "best", "", said);
  const to = maybeText(from, "to", "", said);
  return question === undefined || (own(from, "options") !== undefined && options === undefined)
    ? undefined
    : without({ question, options, best, to });
};

const doneWhen: Reader<ToolArgs["done_when"]> = (from, said) => {
  const checks = listOf(from, "checks", "", said, (one, at, s) => readCheck(one, at, s));
  return checks === undefined ? undefined : { checks };
};

const report: Reader<ToolArgs["report"]> = (from, said) => {
  const result = oneOf(from, "result", "", results, said);
  const says = text(from, "says", "", said);
  const evidence = listOf(from, "evidence", "", said, (one, at, s) => readEvidence(one, at, s, "link"));
  return result === undefined || says === undefined || evidence === undefined
    ? undefined
    : { result, says, evidence: evidence as ToolArgs["report"]["evidence"] };
};

const check: Reader<ToolArgs["check"]> = (from, said) => {
  const evidence = listOf(from, "evidence", "", said, (one, at, s) => readEvidence(one, at, s, "at"));
  const says = text(from, "says", "", said);
  return evidence === undefined || says === undefined ? undefined : { evidence: evidence as ToolArgs["check"]["evidence"], says };
};

function readVerdict(one: Obj, path: string, said: Said): ToolArgs["judge"]["verdicts"][number] | undefined {
  const manager = text(one, "manager", path, said);
  const kind = text(one, "kind", path, said);
  const is = flag(one, "is", path, said);
  const why = text(one, "why", path, said);
  const fit = number01(one, "fit", path, said);
  return manager === undefined || kind === undefined || is === undefined || why === undefined || fit === undefined
    ? undefined
    : { manager, kind, is, why, fit };
}

const judge: Reader<ToolArgs["judge"]> = (from, said) => {
  const verdicts = listOf(from, "verdicts", "", said, (one, at, s) => readVerdict(one, at, s));
  const joins = maybeText(from, "joins", "", said);
  return verdicts === undefined ? undefined : without({ verdicts, joins });
};

const skill: Reader<ToolArgs["skill"]> = (from, said) => {
  const id = text(from, "id", "", said);
  const path = maybeText(from, "path", "", said);
  return id === undefined ? undefined : without({ id, path });
};

const webRead: Reader<ToolArgs["web_read"]> = (from, said) => {
  const url = text(from, "url", "", said);
  return url === undefined ? undefined : { url };
};

const words: Reader<ToolArgs["find"]> = (from, said) => {
  const found = text(from, "words", "", said);
  return found === undefined ? undefined : { words: found };
};

const look: Reader<ToolArgs["look"]> = (from, said) => {
  const at = oneOf(from, "at", "", lookAt, said);
  const id = maybeText(from, "id", "", said);
  return at === undefined ? undefined : without({ at, id });
};

const doing: Reader<ToolArgs["act"]> = (from, said) => {
  const what = text(from, "doing", "", said);
  const values = texts(from, "values", "", said);
  return what === undefined || values === undefined ? undefined : { doing: what, values };
};

const setUp: Reader<ToolArgs["set_up"]> = (from, said) => {
  if (Object.prototype.hasOwnProperty.call(from, "event")) return { event: from["event"] };
  said.push("event is missing: say what to set up.");
  return undefined;
};

export const readers: { readonly [T in keyof ToolArgs]: Reader<ToolArgs[T]> } = {
  note,
  ask,
  done_when: doneWhen,
  report,
  check,
  judge,
  skill,
  web_read: webRead,
  web_search: words,
  find: words,
  look,
  act: doing,
  show_me: doing,
  set_up: setUp,
};

export function isObject(args: unknown): boolean {
  return record(args) !== null;
}
