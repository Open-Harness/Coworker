import { expect, it } from "vitest";
import type { Billing } from "~/modules/billing/types.ts";
import { billingWorld } from "~/modules/billing/testing.ts";
import { countingIds, fakeClock, worldClock } from "~/modules/clock/testing.ts";
import type { Clock, Ids } from "~/modules/clock/types.ts";
import { eml, fakeFiles } from "~/modules/email/testing.ts";
import { FAKE_GITHUB_SECRET, gitHubWorld } from "~/modules/github/testing.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import { outbox } from "~/modules/mail/testing.ts";
import type { Mailer } from "~/modules/mail/types.ts";
import { modelProviders } from "~/modules/models/testing.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { SandboxHost } from "~/modules/sandboxes/types.ts";
import type { FileStore } from "~/modules/triggers/types.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import type { MasterKey } from "~/modules/vault/types.ts";

/** Book section 2, row by row: the fake each outside thing has in the fast tier. Each comes from a `testing.ts`. */
const FAKES = {
  modelProviders: modelProviders satisfies (request: Request) => Promise<Response | undefined>,
  emailIn: eml satisfies (...input: never[]) => unknown,
  emailOut: outbox satisfies Mailer,
  gitHubIn: FAKE_GITHUB_SECRET satisfies string,
  gitHubOut: gitHubWorld satisfies GitHubApi,
  sandboxes: sandboxWorld satisfies SandboxHost,
  masterKey: testMasterKey() satisfies MasterKey,
  clock: fakeClock() satisfies Clock,
  worldClock: worldClock satisfies Clock,
  ids: countingIds() satisfies Ids,
  billing: billingWorld satisfies Billing,
  files: fakeFiles satisfies FileStore,
};

/** The real ones, by what builds them, and the module that defines each. */
const REAL: readonly (readonly [string, string])[] = [
  ["emailServiceMailer", "mail"],
  ["appApi", "github"],
  ["secretsStoreMasterKey", "vault"],
  ["r2Files", "triggers"],
  ["systemClock", "clock"],
  ["randomIds", "clock"],
  ["noContainers", "sandboxes"],
  ["unbilled", "billing"],
  // `createAgent` ("agent") joins this list once the loop is built and a root builds it.
];
// The composition root: `main.ts`, the world it is built in, and the `*-root.ts` files it is split into.
const ROOTS = new Set([
  "./main.ts",
  "./world.ts",
  "./console-root.ts",
  "./github-root.ts",
  "./mail-root.ts",
  "./templates-root.ts",
  "./working-root.ts",
]);

const sources = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./routeTree.gen.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

it("acc:worlds/fakes", () => {
  for (const [name, fake] of Object.entries(FAKES)) expect(fake, name).toBeDefined();
  expect(Object.keys(sources).length).toBeGreaterThan(100);
  const builders = REAL.flatMap(([real, home]) =>
    Object.entries(sources)
      .filter(([file, text]) => new RegExp(`\\b${real}\\b`, "u").test(text) && !file.startsWith(`./modules/${home}/`))
      .map(([file]) => `${file} uses ${real}`),
  );
  expect(builders.filter((line) => !ROOTS.has(line.split(" ")[0] ?? ""))).toEqual([]);
  // The roots do build them: the real world is wired, not merely absent.
  for (const [real] of REAL)
    expect(
      builders.some((line) => line.endsWith(` ${real}`)),
      real,
    ).toBe(true);
});
