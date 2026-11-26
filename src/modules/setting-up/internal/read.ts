import type { Files, Measure, Objective } from "~/modules/playbook/types.ts";
import type { Case10, Question, WalkEvent, Wants } from "~/modules/walkthrough/types.ts";

/* What was sent as an event, narrowed. Anything wrong comes back as a sentence the sender can act on, never as an exception. */

type Rec = Readonly<Record<string, unknown>>;
export type Read<T> = { readonly _tag: "Read"; readonly value: T } | { readonly _tag: "Wrong"; readonly says: string };

const read = <T>(value: T): Read<T> => ({ _tag: "Read", value });
const wrong = (says: string): Read<never> => ({ _tag: "Wrong", says });

const rec = (value: unknown): Rec | null => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Rec) : null);
const str = (from: Rec, key: string): string | undefined => (typeof from[key] === "string" ? from[key] : undefined);
const strings = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((one) => typeof one === "string") ? (value as readonly string[]) : undefined;

function measureOf(value: unknown): Measure | undefined {
  const m = rec(value);
  const reads = rec(m?.["read"]);
  const before = rec(m?.["before"]);
  if (m === null || reads === null || before === null) return undefined;
  const [counts, unit, settles] = [str(m, "counts"), str(m, "unit"), str(m, "settles")];
  if (counts === undefined || unit === undefined || settles === undefined) return undefined;
  if (m["better"] !== "more" && m["better"] !== "less") return undefined;
  const from =
    reads["from"] === "connector" && str(reads, "account") !== undefined && str(reads, "query") !== undefined
      ? { from: "connector" as const, account: str(reads, "account") ?? "", query: str(reads, "query") ?? "" }
      : reads["from"] === "person" && str(reads, "person") !== undefined && str(reads, "asks") !== undefined
        ? { from: "person" as const, person: str(reads, "person") ?? "", asks: str(reads, "asks") ?? "" }
        : undefined;
  const known =
    typeof before["value"] === "number" && str(before, "at") !== undefined
      ? { value: before["value"], at: str(before, "at") ?? "" }
      : str(before, "unknown") !== undefined
        ? { unknown: str(before, "unknown") ?? "" }
        : undefined;
  return from === undefined || known === undefined ? undefined : { counts, unit, better: m["better"], read: from, settles, before: known };
}

function objectiveOf(value: unknown): Objective | undefined {
  const o = rec(value);
  const aim = rec(o?.["aim"]);
  if (o === null || aim === null || !Array.isArray(o["notWorse"])) return undefined;
  const [said, owner, measure] = [str(o, "said"), str(o, "owner"), measureOf(o["measure"])];
  if (said === undefined || owner === undefined || measure === undefined) return undefined;
  if (typeof aim["value"] !== "number" || str(aim, "by") === undefined) return undefined;
  const notWorse = o["notWorse"].map((one) => {
    const guard = rec(one);
    const guarded = measureOf(guard?.["measure"]);
    return guard !== null && guarded !== undefined && typeof guard["limit"] === "number"
      ? { measure: guarded, limit: guard["limit"] }
      : undefined;
  });
  if (notWorse.some((one) => one === undefined)) return undefined;
  return { said, measure, aim: { value: aim["value"], by: str(aim, "by") ?? "" }, notWorse: notWorse as Objective["notWorse"], owner };
}

function questionOf(value: unknown): Question | undefined {
  const q = rec(value);
  if (q === null) return undefined;
  const [id, ask, best, because] = [str(q, "id"), str(q, "ask"), str(q, "best"), str(q, "because")];
  const [picks, changes] = [strings(q["picks"]), strings(q["changes"])];
  return id === undefined ||
    ask === undefined ||
    best === undefined ||
    because === undefined ||
    picks === undefined ||
    changes === undefined
    ? undefined
    : { id, ask, picks, best, because, changes };
}

function filesOf(value: unknown): Files | undefined {
  const files = rec(value);
  return files !== null && Object.values(files).every((one) => typeof one === "string") ? (files as Files) : undefined;
}

function listOf<T>(value: unknown, one: (item: unknown) => T | undefined): readonly T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const all = value.map(one);
  return all.every((item) => item !== undefined) ? (all as readonly T[]) : undefined;
}

const wantOf = (value: unknown): Omit<Wants, "state"> | undefined => {
  const w = rec(value);
  const [connector, reads, tells, without] = [w && str(w, "connector"), w && str(w, "reads"), w && str(w, "tells"), w && str(w, "without")];
  return connector === undefined || connector === null || reads == null || tells == null || without == null
    ? undefined
    : { connector, reads, tells, without };
};

const caseOf = (value: unknown): Omit<Case10, "said"> | undefined => {
  const c = rec(value);
  const [id, what, would, happened] = [c && str(c, "id"), c && str(c, "what"), c && str(c, "would"), c && str(c, "happened")];
  return id == null || what == null || would == null || happened == null ? undefined : { id, what, would, happened };
};

const findingOf = (value: unknown) => {
  const f = rec(value);
  const [id, says, from] = [f && str(f, "id"), f && str(f, "says"), f && str(f, "from")];
  return id == null || says == null || from == null ? undefined : { id, says, from };
};

/** What the co-worker may say: the events that are its own. */
const OF_THE_CO_WORKER = ["measured", "could carry", "asks", "wants", "found", "drafted"] as const;
/** What a person may say. */
const OF_A_PERSON = ["answers", "connected", "skipped", "that is wrong", "edited", "judged", "make it", "throw away"] as const;

/** An event from the co-worker, as the `set_up` tool is called with it. */
export function readOfCoworker(value: unknown): Read<WalkEvent> {
  const e = rec(value);
  const is = e === null ? undefined : OF_THE_CO_WORKER.find((one) => one === e["is"]);
  if (e === null || is === undefined) {
    const person = e === null ? undefined : OF_A_PERSON.find((one) => one === e["is"]);
    return wrong(
      person === undefined
        ? `The event must say what it is, one of: ${OF_THE_CO_WORKER.join(", ")}.`
        : `"${person}" is for the person to say, not you.`,
    );
  }
  switch (is) {
    case "measured": {
      const objective = objectiveOf(e["objective"]);
      return objective === undefined
        ? wrong(
            "measured needs an objective: said, measure (counts, unit, better, read, settles, before), aim (value, by), notWorse, owner.",
          )
        : read({ is, objective });
    }
    case "could carry": {
      const [manager, change] = [str(e, "manager"), str(e, "change")];
      return manager === undefined || change === undefined
        ? wrong("could carry needs the manager and the change.")
        : read({ is, manager, change });
    }
    case "asks": {
      const questions = listOf(e["questions"], questionOf);
      return questions === undefined
        ? wrong("asks needs questions, each with id, ask, picks, best, because and changes.")
        : read({ is, questions });
    }
    case "wants": {
      const wants = listOf(e["wants"], wantOf);
      return wants === undefined ? wrong("wants needs a list, each with connector, reads, tells and without.") : read({ is, wants });
    }
    case "found": {
      const findings = listOf(e["findings"], findingOf);
      return findings === undefined ? wrong("found needs findings, each with id, says and from.") : read({ is, findings });
    }
    case "drafted": {
      const [draft, cases] = [filesOf(e["draft"]), listOf(e["cases"], caseOf)];
      return draft === undefined || cases === undefined
        ? wrong("drafted needs the draft as files, and the cases.")
        : read({ is, draft, cases });
    }
  }
}

/** An event from a person, as the page sends it. Who said it is not taken from what was sent: `by` is given. */
export function readOfPerson(value: unknown, by: string): Read<WalkEvent> {
  const e = rec(value);
  const is = e === null ? undefined : OF_A_PERSON.find((one) => one === e["is"]);
  if (e === null || is === undefined) return wrong(`Say what it is, one of: ${OF_A_PERSON.join(", ")}.`);
  switch (is) {
    case "answers": {
      const given = rec(e["answers"]);
      return given === null || !Object.values(given).every((one) => typeof one === "string")
        ? wrong("answers needs the answers as text, by question.")
        : read({ is, by, answers: given as Readonly<Record<string, string>> });
    }
    case "connected":
    case "skipped": {
      const connector = str(e, "connector");
      return connector === undefined ? wrong(`${is} needs the connector.`) : read({ is, connector });
    }
    case "that is wrong": {
      const [finding, says] = [str(e, "finding"), str(e, "says")];
      return finding === undefined || says === undefined
        ? wrong("that is wrong needs the finding and what is wrong with it.")
        : read({ is, finding, says });
    }
    case "edited": {
      const [draft, lines] = [filesOf(e["draft"]), strings(e["lines"])];
      return draft === undefined || lines === undefined
        ? wrong("edited needs the draft as files, and the lines changed.")
        : read({ is, draft, lines, by });
    }
    case "judged": {
      const [one, said] = [str(e, "case"), e["said"]];
      return one === undefined || (said !== "right" && said !== "wrong")
        ? wrong("judged needs the case, and right or wrong.")
        : read({ is, case: one, said });
    }
    case "make it":
    case "throw away":
      return read({ is, by });
  }
}
