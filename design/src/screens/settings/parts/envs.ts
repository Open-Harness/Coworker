/* Where a thread runs: a machine with a set-up, secrets by name, and a size. Never a value. */
export interface Start { at: string; took: string; ok: boolean; why?: string }
export interface Env extends Record<string, unknown> {
  id: string; name: string; about: string; script: string; secrets: readonly { name: string; changed: string }[]; size: string; usedBy: readonly string[]; starts: readonly Start[];
}
export const SIZES = ["Small: 1 CPU, 2 GB", "Medium: 2 CPU, 4 GB", "Large: 4 CPU, 8 GB"] as const;
export const ENVS: readonly Env[] = [
  { id: "web", name: "acme/web, Node 22", about: "The repo, its packages installed and built", usedBy: ["Coding", "Docs", "Releases"], size: SIZES[1],
    script: "corepack enable\npnpm install --frozen-lockfile\npnpm build\ncp .env.example .env.test",
    secrets: [{ name: "NPM_READ_TOKEN", changed: "2 Nov" }, { name: "STRIPE_TEST_KEY", changed: "2 Nov" }],
    starts: [{ at: "25 Nov, 09:48", took: "41 s", ok: true }, { at: "25 Nov, 09:31", took: "38 s", ok: true }, { at: "24 Nov, 16:02", took: "12 s", ok: false, why: "pnpm install: 401 for a private package" }, { at: "24 Nov, 10:40", took: "40 s", ok: true }, { at: "24 Nov, 09:14", took: "43 s", ok: true }] },
  { id: "browser", name: "Browser checks", about: "Chromium and the test runner, for screenshots", usedBy: ["Coding"], size: SIZES[2],
    script: "corepack enable\npnpm install --frozen-lockfile\npnpm exec playwright install chromium",
    secrets: [{ name: "NPM_READ_TOKEN", changed: "2 Nov" }],
    starts: [{ at: "25 Nov, 07:12", took: "1 min 4 s", ok: true }, { at: "24 Nov, 15:55", took: "1 min 9 s", ok: true }, { at: "23 Nov, 11:20", took: "58 s", ok: true }] },
  { id: "plain", name: "Plain", about: "Nothing installed. For reading and writing", usedBy: ["Sales", "Support", "WhatsApp desk"], size: SIZES[0],
    script: "", secrets: [],
    starts: [{ at: "25 Nov, 09:40", took: "3 s", ok: true }, { at: "25 Nov, 09:12", took: "3 s", ok: true }, { at: "25 Nov, 08:30", took: "4 s", ok: true }] },
];
