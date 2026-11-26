import { expect } from "vitest";
import { threads } from "~/modules/threads/service.ts";
import type { Brief } from "~/modules/threads/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";

export const brief: Brief = {
  role: "does",
  page: "PAGE-TOKEN This manager fixes issues.\nIt asks when it is unsure.",
  agent: { name: "Doer", told: "TOLD-TOKEN Read before you write." },
  skills: [{ id: "this-repo", says: "SKILL-TOKEN How this repo tests." }],
  work: {
    id: "w-17",
    title: "WORK-TOKEN Fix the login",
    about: "ABOUT-TOKEN The login fails on Safari.",
    doneWhen: [{ id: "d1", says: "DONE-TOKEN Tests pass", by: "command", run: "pnpm test" }],
    step: "write",
  },
  place: { says: "PLACE-TOKEN Installs with pnpm.", files: { "AGENTS.md": "FILE-TOKEN Rules of the repo." } },
  thread: [
    { by: "Pat", at: 1, text: "THREAD-TOKEN-1 The login fails." },
    { by: "Bo", at: 2, text: "THREAD-TOKEN-2 Please fix it." },
  ],
  notes: ["NOTE-TOKEN Pat prefers mail."],
  todo: "TODO-TOKEN Write the fix.",
};
export const text = (b: Brief) => {
  const p = threads.prompt(b);
  return `${p.system}\n${p.user}`;
};
export const at = (haystack: string, needle: string) => {
  const i = haystack.indexOf(needle);
  expect(i, needle).toBeGreaterThanOrEqual(0);
  return i;
};
export const lines = (s: string) => s.split("\n");

export const mandate: Mandate = {
  grants: [
    {
      account: "github",
      place: "acme/web",
      may: { "github.read": "on", "github.comment": "on", "github.push": "ask", "github.merge": "off" },
    },
    { account: "email", place: "*", may: { "email.reply": "on" } },
  ],
  limits: {},
  strength: "asked",
  because: { by: "person", id: "ama" },
  version: 6,
  state: "holds",
};
export const base = ["read", "write", "edit", "bash", "web_read", "web_search", "note", "ask", "done_when", "report", "skill"];
export const doer = { tools: [...base, "github.read", "github.comment", "github.push", "github.merge", "github.label", "email.reply"] };
export const sorted = (list: readonly string[]) => [...list].sort();
export const github = { account: "github", place: "acme/web" };
export const connector = (list: readonly string[]) => list.filter((t) => t.includes("."));
