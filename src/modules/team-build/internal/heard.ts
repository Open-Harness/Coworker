import type { EventLine } from "../types.ts";
import { EVENT_LABEL } from "./words.ts";

/* What an Events line says, in the words a person reads. The Workspace writes `email from ama: “Hello” → ignored: not on the list`; the manager's decision comes with it. */

export type Outcome = "accepted" | "followup" | "waiting" | "would" | "ignored" | "dropped" | "other";
export type Origin = "email" | "github" | "other";

export interface Heard {
  readonly outcome: Outcome;
  readonly origin: Origin;
  /** What arrived: a subject or a title. */
  readonly title: string;
  /** Who it came from. */
  readonly from: string;
  /** What the Gate made of it. */
  readonly strength: "Explicit" | "Inferred" | "Follow-up" | "Not admitted" | "Unknown";
  readonly gate: string;
  /** What the manager made of it; absent when the Gate kept it from the manager. */
  readonly manager?: string;
  /** What became of it, or why nothing did, in a few words. */
  readonly result: string;
  /** The Task it became, joined or followed. */
  readonly task?: string;
}

type What = Pick<Heard, "origin" | "title" | "from">;

const WHAT = /^(\w+) from (.*?): “(.*)”$/su;

function whatOf(what: string): What {
  const found = WHAT.exec(what);
  if (found === null) return { origin: "other", title: what, from: "" };
  const [, kind = "", from = "", title = ""] = found;
  return { origin: kind === "email" || kind === "github" ? kind : "other", title, from };
}

const sentence = (text: string): string => text.trim().replace(/\.$/u, "");

/** The Gate names a repo's events as GitHub does; a person reads them as the Sources page says them. */
const reasonOf = (reason: string): string =>
  sentence(reason).replace(/^(\w+) is not chosen for /u, (whole, event: string) =>
    event in EVENT_LABEL ? `${EVENT_LABEL[event as keyof typeof EVENT_LABEL]}: not chosen for ` : whole,
  );

function decided(line: EventLine, strength: string): Pick<Heard, "outcome" | "strength" | "gate" | "manager" | "result" | "task"> {
  const { decision } = line;
  const passed =
    strength === "explicit"
      ? ({ strength: "Explicit", gate: "Passed. The sender may ask, and asked this manager directly." } as const)
      : ({ strength: "Inferred", gate: "Passed. The sender may ask, but did not ask this manager directly." } as const);
  if (decision === undefined)
    return { ...passed, outcome: "waiting", manager: "The manager has not decided yet.", result: "The manager has not decided yet" };
  const { task } = decision;
  if (decision.kind === "accept" && task !== undefined)
    return { ...passed, outcome: "accepted", manager: `The manager made it task ${task}.`, result: `Task ${task}`, task };
  if (decision.kind === "attach" && task !== undefined)
    return { ...passed, outcome: "accepted", manager: `The manager added it to task ${task}.`, result: `Added to ${task}`, task };
  const reason = sentence(decision.reason ?? "Not work");
  if (decision.wouldAccept === true)
    return {
      ...passed,
      outcome: "would",
      manager: `The manager ignored it: ${reason}. It would have taken it in Auto mode.`,
      result: reason,
    };
  return { ...passed, outcome: "ignored", manager: `The manager ignored it: ${reason}.`, result: reason };
}

/** One Events line, read: what arrived, what it became and, when it was ignored, why. */
export function heardOf(line: EventLine): Heard {
  const arrow = line.line.lastIndexOf(" → ");
  if (arrow < 0) {
    const gate = "Heard before, or the manager could not be reached.";
    return { ...whatOf(line.line), outcome: "other", strength: "Unknown", gate, result: sentence(gate) };
  }
  const what = whatOf(line.line.slice(0, arrow));
  const result = line.line.slice(arrow + 3);
  const task = /^follow-up on (\S+)$/u.exec(result)?.[1];
  if (task !== undefined)
    return {
      ...what,
      outcome: "followup",
      strength: "Follow-up",
      gate: `Skipped. It is a reply on the thread of ${task}.`,
      manager: `It went to the manager, on ${task}.`,
      result: `Reply on ${task}`,
      task,
    };
  const dropped = /^(?:ignored|dropped):\s*(.*)$/su.exec(result)?.[1];
  if (dropped !== undefined) {
    const reason = reasonOf(dropped);
    return { ...what, outcome: "dropped", strength: "Not admitted", gate: `Ignored by the Gate: ${reason}.`, result: reason };
  }
  return { ...what, ...decided(line, result.replace(/ candidate$/u, "")) };
}

/** What became of things, in the order the page groups them. */
export const OUTCOMES: readonly {
  readonly value: Outcome;
  readonly label: string;
  readonly dot: "success" | "accent" | "warning" | "neutral";
  readonly token: "green" | "blue" | "yellow" | "gray";
}[] = [
  { value: "waiting", label: "Waiting", dot: "warning", token: "yellow" },
  { value: "accepted", label: "Accepted", dot: "success", token: "green" },
  { value: "followup", label: "Follow-ups", dot: "accent", token: "blue" },
  { value: "would", label: "Would accept", dot: "warning", token: "yellow" },
  { value: "ignored", label: "Ignored", dot: "neutral", token: "gray" },
  { value: "dropped", label: "Not admitted", dot: "neutral", token: "gray" },
  { value: "other", label: "Other", dot: "neutral", token: "gray" },
];

export const ORIGIN: Readonly<Record<Origin, string>> = { email: "Email", github: "GitHub", other: "Other" };

/** A heard line as a row. */
export interface HeardRow extends Heard, Record<string, unknown> {
  readonly id: string;
  readonly at: number;
  /** Everything a search looks in. */
  readonly words: string;
}

export const rowsOf = (events: readonly EventLine[]): readonly HeardRow[] =>
  events.map((event) => {
    const heard = heardOf(event);
    const words = [heard.title, heard.from, ORIGIN[heard.origin], heard.result].join(" ");
    return { ...heard, id: `${event.at} ${event.line}`, at: event.at, words };
  });
