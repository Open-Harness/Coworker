import { stringify } from "yaml";
import type { Because, Files, Line, Playbook } from "~/modules/playbook/types.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";
import { judgedCases, DRAFT_COMMENTS, LIVE_COMMENTS } from "./sales-notes.ts";
import { EVALS } from "./sales-evals.ts";
import { AGENTS, LEFT_OUT, LIFT, MODEL_NAMES, OBJECTIVE, OWN, PAGE_SKILL, USED, USERS, reach } from "./sales-parts.ts";
import { page, skillFiles } from "./sales-text.ts";
import { triggers } from "./sales-triggers.ts";
import { FIRST_TIME, kinds, type Variant } from "./sales-work.ts";

/* Sales as a playbook, in the draft Juno wrote on 5 October and as it runs at version 6: the object, its files, and the view of both. */

export const SALES_HEAD = {
  id: "sales",
  name: "Sales",
  above: "root",
  is: "working",
  now: "2 threads, writing to new leads",
  version: 6,
} as const;

const MAIL = "juno@acme.co-worker.tech";
const front = (words: Record<string, unknown>): string => `---\n${yaml(words)}---\n\n`;
const yaml = (value: unknown): string => stringify(value, { aliasDuplicateObjects: false, lineWidth: 0 });
const body = (text: string): string => text.replace(/^---\n[\s\S]*?\n---\n\n/u, "").replace(/\n$/u, "");

/** Why each line is there. */
export function because(): Readonly<Record<Line, Because>> {
  const said = (by: string, where: string): Because => ({ why: "you said", by, where });
  const looked = (where: string): Because => ({ why: "looked up", where });
  const mine: Because = { why: "my idea" };
  const steps = (kind: string, ids: readonly string[], by: Readonly<Record<string, Because>>): [Line, Because][] =>
    ids.map((id) => [`workflow/${kind}/${id}`, by[id] ?? mine]);
  const mark: Readonly<Record<string, Because>> = {
    look: looked("the CRM, 46 deals won this year"),
    write: looked("212 mails Bo sent"),
    read: mine,
    yes: said("bo", "the first questions"),
    add: mine,
    send: looked("the CRM and the mail, 30 days"),
  };
  return Object.fromEntries([
    ["page", said("ama", "the first questions")],
    ["objective", said("ama", "what you said")],
    ["workflow/asked", looked("96 people wrote in 30 days")],
    ["workflow/signal", looked("28 of 46 wins began with a change at the company")],
    ["workflow/like", mine],
    ["workflow/quiet", mine],
    ...steps("asked", ["look", "write", "read", "send"], mark),
    ...steps("signal", ["look", "write", "read", "yes", "send"], mark),
    ...steps("like", ["look", "add"], mark),
    ...steps("quiet", ["write", "read", "send"], mark),
    ["triggers/signs", looked("the same search tried on 30 days")],
    ["triggers/like", mine],
    ["triggers/mail", looked("96 people wrote in 30 days")],
    ["triggers/deals", looked("the CRM")],
    ["triggers/quiet", mine],
    ["triggers/people", said("ama", "the first questions")],
    ["agents/researcher", looked("what Bo does today")],
    ["agents/writer", looked("212 mails Bo sent")],
    ["agents/reader", mine],
    ["skills/bos-voice", looked("212 mails Bo sent")],
    ["skills/sign", looked("the CRM, 46 deals won this year")],
    [`reach/email/${MAIL}`, looked("the mail, 30 days")],
    ["reach/crm/*", said("bo", "the first questions")],
    ["reach/calendar/bo", mine],
    ["reach/web/*", mine],
    ...EVALS.map((one): [Line, Because] => [`evals/${one.id}`, one.id === "playbook" ? said("ama", "what you said") : mine]),
  ]);
}

export function salesPlaybook(variant: Variant): Playbook {
  const files = skillFiles(variant);
  return {
    name: "Sales",
    page: page(variant),
    objective: OBJECTIVE,
    kinds: kinds(variant),
    triggers: triggers(variant).map((one) => one.trigger),
    agents: AGENTS,
    skills: [...OWN, ...USED],
    skillFiles: Object.fromEntries(Object.entries(files).map(([path, text]) => [path, path.endsWith("SKILL.md") ? body(text) : text])),
    reach: reach(variant),
    evals: EVALS.map((one) => ({ id: one.id, ...one.eval })),
    because: because(),
  };
}

/** The playbook as the files it is kept in: the shapes of `docs/templates`. */
export function salesFiles(variant: Variant): Files {
  const one = salesPlaybook(variant);
  const own = skillFiles(variant);
  return {
    "SKILL.md": `${front({ name: one.name })}${one.page}\n`,
    "objective.yaml": yaml(one.objective),
    "workflow.yaml": yaml({ kinds: one.kinds }),
    "triggers.yaml": yaml({ triggers: one.triggers }),
    ...Object.fromEntries(
      one.agents.map((a) => [
        `agents/${a.id}.md`,
        `${front({ name: a.name, is: a.is, skills: a.skills, tools: a.tools, model: a.model })}${a.told}\n`,
      ]),
    ),
    "skills.yaml": yaml({ use: USED }),
    ...own,
    "reach.yaml": yaml(one.reach),
    ...Object.fromEntries(one.evals.map(({ id, ...rest }) => [`evals/${id}.yaml`, yaml(rest)])),
    "because.yaml": yaml(one.because),
  };
}

export function salesView(variant: Variant): PlaybookView {
  const draft = variant === "draft";
  const playbook = salesPlaybook(variant);
  const skills = [PAGE_SKILL, ...OWN, ...USED.filter((s) => s.layer === "craft"), LEFT_OUT, ...USED.filter((s) => s.layer !== "craft")].map(
    (s) => ({
      ...s,
      with: LIFT[s.id]?.with ?? null,
      without: LIFT[s.id]?.without ?? null,
      of: LIFT[s.id]?.of ?? null,
      by: USERS[s.id] ?? [],
      left: s.id === "objections" ? "Writer did as well without it: 46 of 100 sent unchanged, both times." : null,
      also: s.id === "company" ? ["Coding"] : [],
    }),
  );
  return {
    head: draft ? null : SALES_HEAD,
    draft,
    playbook,
    files: salesFiles(variant),
    version: draft ? 0 : 6,
    problems: [],
    comments: draft ? DRAFT_COMMENTS : LIVE_COMMENTS,
    because: playbook.because,
    evals: EVALS.map((one) => ({
      eval: { id: one.id, ...one.eval },
      now: draft ? one.first : one.now,
      seen: one.seen,
      was: draft ? null : one.first,
      how: one.how,
    })),
    triggers: triggers(variant).map((one) => {
      const [came, took, cost] = draft ? one.past : one.week;
      const next = draft ? null : one.trigger.id === "signs" ? at("26 Nov 08:30") : one.trigger.id === "like" ? at("30 Nov 06:00") : null;
      return { trigger: one.trigger, came, took, cost, next, from: one.from, says: one.says, most: one.most };
    }),
    agents: AGENTS.map((agent) => ({
      agent,
      model: agent.model === "inherit" ? "" : (MODEL_NAMES[agent.model.model] ?? agent.model.model),
      from: "agent",
      shared: draft && agent.id === "researcher" ? "Coding" : null,
    })),
    skills,
    accounts: draft
      ? [
          { account: "email", state: "works", person: null },
          { account: "crm", state: "read only", person: null },
          { account: "calendar", state: "waits", person: "Bo" },
          { account: "web", state: "built in", person: null },
        ]
      : [
          { account: "email", state: "works", person: null },
          { account: "crm", state: "works", person: null },
          { account: "calendar", state: "works", person: null },
          { account: "web", state: "built in", person: null },
        ],
    steps: Object.fromEntries(
      playbook.kinds.flatMap((k) =>
        k.steps.map((s): [Line, { first: number; now: number; line: number }] => [
          `workflow/${k.id}/${s.id}`,
          FIRST_TIME[s.id] ?? { first: 0, now: 0, line: 0 },
        ]),
      ),
    ),
    record: {
      asked: "56 in 30 days, 2 corrected",
      signal: "22 in 30 days, Bo said yes to 19",
      like: "18 in 30 days, Bo marked 9 right and 4 wrong",
      quiet: "22 in 30 days, none corrected",
    },
    worse: draft
      ? []
      : [
          { counts: "Open and answering what it asks, not the call", now: 3, limit: 10, is: "fine" },
          { counts: "Asked us not to write again, 30 days", now: 1.04, limit: 3, is: "fine" },
          { counts: "Models and searches, all of Sales", now: 5.8, limit: 15, is: "fine" },
        ],
    saidBy: { person: "Ama Mensah", at: at("5 Oct 09:30") },
    cases: { shown: judgedCases(variant), total: draft ? 148 : 412 },
    past: draft ? { from: at("5 Sep 00:00"), to: at("4 Oct 23:59") } : null,
    newer: null,
  };
}
