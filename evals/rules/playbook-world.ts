import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { playbooks } from "~/modules/playbook/service.ts";
import type { AgentRole, Files, Kind, Playbook, ReadPlaybook, Step, Surroundings } from "~/modules/playbook/types.ts";

/*
 * Shared by the playbook and templates evals: the two written templates as files, the same filled by hand (so that the
 * playbook evals do not lean on the templates module), what is around them, and edits of a playbook.
 */

export type TemplateName = "repo" | "customers";

const root = fileURLToPath(new URL("../../docs/templates/", import.meta.url));

function walk(dir: string, prefix: string, into: Record<string, string>): void {
  for (const name of readdirSync(dir).sort()) {
    const full = `${dir}/${name}`;
    if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`, into);
    else into[`${prefix}${name}`] = readFileSync(full, "utf8");
  }
}

/** The folder of a written template, as the composition root gives it in: every file, `template.yaml` too. */
export function folder(name: TemplateName): Files {
  const into: Record<string, string> = {};
  walk(`${root}${name}`, "", into);
  return into;
}

export const plainAnswers: Record<TemplateName, Record<string, string>> = {
  repo: {
    repo: "acme/web",
    name: "Coding",
    owner: "ama",
    label: "juno",
    perWork: "10",
    perDay: "40",
    doer: "inherit",
    reviewer: "inherit",
    judge: "inherit",
    install: "pnpm install",
    test: "pnpm test",
  },
  customers: {
    mailbox: "help@acme.test",
    name: "Support",
    owner: "ama",
    perWork: "2",
    perDay: "20",
    writer: "inherit",
    reader: "inherit",
    judge: "inherit",
  },
};
const numberBlanks = ["perWork", "perDay"];
const modelBlanks = ["doer", "reviewer", "judge", "writer", "reader"];

/** A template filled by hand, so that the playbook module is judged alone. A model answer is `inherit` or three words. */
export function filledFiles(name: TemplateName, answers: Record<string, string> = plainAnswers[name]): Files {
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(folder(name))) {
    if (path === "template.yaml") continue;
    let next = text;
    for (const [id, value] of Object.entries(answers)) {
      const parts = value.split(" ");
      if (modelBlanks.includes(id) && parts.length === 3)
        next = next.replaceAll(`"{{${id}}}"`, `{ connection: ${parts[0]}, model: ${parts[1]}, thinking: ${parts[2]} }`);
      else if (numberBlanks.includes(id)) next = next.replaceAll(`"{{${id}}}"`, value);
      next = next.replaceAll(`{{${id}}}`, value);
    }
    out[path] = next;
  }
  return out;
}

export function must(read: ReadPlaybook): Playbook {
  if (read._tag === "Problems") throw new Error(`Expected a playbook, got problems: ${JSON.stringify(read.problems)}`);
  return read.playbook;
}

export const mustRead = (files: Files): Playbook => must(playbooks.read(files));

export function playbookOf(name: TemplateName): Playbook {
  return must(playbooks.read(filledFiles(name)));
}

const base = ["read", "write", "edit", "bash", "web_read", "note", "ask", "done_when", "report", "skill", "check", "judge"];
const githubActions = [
  "read",
  "comment",
  "reply_on_line",
  "push",
  "open_pull_request",
  "update_pull_request",
  "rerun_checks",
  "close_issue",
  "merge",
  "label",
].map((a) => `github.${a}`);
const emailActions = ["search", "draft", "reply", "send_inside", "send_outside"].map((a) => `email.${a}`);
const everything = (actions: readonly string[]) => Object.fromEntries(actions.map((a) => [a, "on" as const]));

/** What is around both templates, so that each checks clean. */
export const around: Surroundings = {
  people: ["ama", "bo", "nina"],
  accounts: [
    {
      id: "github",
      actions: githubActions,
      events: ["issue", "label", "comment", "line_comment", "review", "check", "push", "merged", "closed"],
    },
    { id: "email", actions: emailActions, events: ["mail"] },
  ],
  skills: ["review", "answer-a-review", "github", "work", "untrusted", "short-mail", "email"],
  tools: base,
  models: [
    { connection: "anthropic", model: "opus" },
    { connection: "anthropic", model: "haiku" },
  ],
  above: {
    grants: [
      { account: "github", place: "*", may: everything(githubActions) },
      { account: "email", place: "*", may: everything(emailActions) },
    ],
    limits: { perWork: 100, perDay: 500, perMonth: 5000, hours: 1000, atOnce: 100 },
  },
};

export const mapKind = (p: Playbook, id: string, f: (k: Kind) => Kind): Playbook => ({
  ...p,
  kinds: p.kinds.map((k) => (k.id === id ? f(k) : k)),
});
export const mapStep = (p: Playbook, kind: string, step: string, f: (s: Step) => Step): Playbook =>
  mapKind(p, kind, (k) => ({ ...k, steps: k.steps.map((s) => (s.id === step ? f(s) : s)) }));
export const mapAgent = (p: Playbook, id: string, f: (a: AgentRole) => AgentRole): Playbook => ({
  ...p,
  agents: p.agents.map((a) => (a.id === id ? f(a) : a)),
});

/** The difference between two playbooks as lines, found only through `lines`: the lines whose text is not the same. */
export function changedLines(a: Playbook, b: Playbook): string[] {
  const left = new Map(playbooks.lines(a).map((l) => [l.line, l.text]));
  const right = new Map(playbooks.lines(b).map((l) => [l.line, l.text]));
  const all = new Set([...left.keys(), ...right.keys()]);
  return [...all].filter((line) => left.get(line) !== right.get(line)).sort();
}

export const textOf = (p: Playbook, line: string): string | null => playbooks.lines(p).find((l) => l.line === line)?.text ?? null;

/** What a sentence for a person must be: not empty, one plain sentence, no state words. */
export const plain = (says: string): boolean => says.trim().length > 0 && !/\b(blocked|pending)\b/iu.test(says);
