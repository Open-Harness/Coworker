import type { Template } from "../types.ts";

/** The four a first manager can be, and what each starts as. */
export const TEMPLATES: readonly {
  readonly value: Template;
  readonly label: string;
  readonly description: string;
  readonly view: string;
  readonly name: string;
  readonly mission: string;
}[] = [
  {
    value: "kanban",
    label: "Launch manager",
    description: "Ships a release from pull requests and requests.",
    view: "Opens on a Kanban board",
    name: "Launch",
    mission: "Ship v2.3 on 27 November: streaming export, docs and release notes. Nothing ships without my review.",
  },
  {
    value: "incident",
    label: "Incident desk",
    description: "Confirms what is broken, finds who can fix it, keeps everyone updated.",
    view: "Opens on a console",
    name: "Incidents",
    mission: "Run incidents for the checkout service. Page nobody at night for anything below SEV2.",
  },
  {
    value: "support",
    label: "Support triage",
    description: "Answers customers, and hands hard questions to a person.",
    view: "Opens on an inbox",
    name: "Support",
    mission: "Answer customers from the docs. Refunds and anything legal come to me.",
  },
  {
    value: "research",
    label: "Research desk",
    description: "Questions in, short reports out.",
    view: "Opens on a list",
    name: "Research",
    mission: "Look into what the team asks and write one page that says where every claim comes from.",
  },
];

export const OWN = "own";
export type Picked = Template | typeof OWN;

export const templateOf = (value: string | undefined) => TEMPLATES.find((template) => template.value === value);

/** An address made from a name: `Acme Inc.` is `acme-inc`. */
export const addressFrom = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 30)
    .replace(/-+$/u, "");

/** Anyone can have one of these, so they say nothing about where a person works. */
const ANYONES = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
]);

/** The company's domain in a work email, if it looks like one. */
export function workDomain(email: string): string | undefined {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === undefined || ANYONES.has(domain) ? undefined : domain;
}

const isEmail = (text: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(text);

/** The addresses written in a box, by line, comma or space, and what else was there. */
export function emailsIn(text: string): { readonly emails: readonly string[]; readonly wrong: readonly string[] } {
  const entries = [...new Set(text.split(/[\s,;]+/u).filter((entry) => entry !== ""))];
  return { emails: entries.filter(isEmail), wrong: entries.filter((entry) => !isEmail(entry)) };
}
