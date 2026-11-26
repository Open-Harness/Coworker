import type { SharedView } from "~/modules/views-workspace/types.ts";
import { at } from "./read.ts";

/* Where a thread runs: a machine with a set-up, secrets by name, and a size. Never a value. */
export const ENVIRONMENTS: SharedView["environments"] = [
  {
    id: "web",
    name: "acme/web, Node 22",
    about: "The repo, its packages installed and built",
    usedBy: ["Coding", "Docs", "Releases"],
    size: "Medium: 2 CPU, 4 GB",
    setUp: "corepack enable\npnpm install --frozen-lockfile\npnpm build\ncp .env.example .env.test",
    secrets: [
      { name: "NPM_READ_TOKEN", changed: at("2 Nov 12:00") },
      { name: "STRIPE_TEST_KEY", changed: at("2 Nov 12:00") },
    ],
    starts: [
      { at: at("25 Nov 09:48"), took: 41000, ok: true, why: null },
      { at: at("25 Nov 09:31"), took: 38000, ok: true, why: null },
      { at: at("24 Nov 16:02"), took: 12000, ok: false, why: "pnpm install: 401 for a private package" },
      { at: at("24 Nov 10:40"), took: 40000, ok: true, why: null },
      { at: at("24 Nov 09:14"), took: 43000, ok: true, why: null },
    ],
  },
  {
    id: "browser",
    name: "Browser checks",
    about: "Chromium and the test runner, for screenshots",
    usedBy: ["Coding"],
    size: "Large: 4 CPU, 8 GB",
    setUp: "corepack enable\npnpm install --frozen-lockfile\npnpm exec playwright install chromium",
    secrets: [{ name: "NPM_READ_TOKEN", changed: at("2 Nov 12:00") }],
    starts: [
      { at: at("25 Nov 07:12"), took: 64000, ok: true, why: null },
      { at: at("24 Nov 15:55"), took: 69000, ok: true, why: null },
      { at: at("23 Nov 11:20"), took: 58000, ok: true, why: null },
    ],
  },
  {
    id: "plain",
    name: "Plain",
    about: "Nothing installed. For reading and writing",
    usedBy: ["Sales", "Support", "WhatsApp desk"],
    size: "Small: 1 CPU, 2 GB",
    setUp: "",
    secrets: [],
    starts: [
      { at: at("25 Nov 09:40"), took: 3000, ok: true, why: null },
      { at: at("25 Nov 09:12"), took: 3000, ok: true, why: null },
      { at: at("25 Nov 08:30"), took: 4000, ok: true, why: null },
    ],
  },
];
