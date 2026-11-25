import { describe, expect, it } from "vitest";
import example from "~/../.dev.vars.example?raw";
import config from "~/../wrangler.jsonc?raw";
import fakeModel from "~/../wrangler.fake-model.jsonc?raw";
import mailbox from "~/../wrangler.mailbox.jsonc?raw";
import manifestText from "~/../live/github-app-manifest.json?raw";
import { addressesOn } from "~/modules/mailbox/types.ts";
import { live, LIVE_IDS } from "./service.ts";

const manifest = JSON.parse(manifestText) as {
  name: string;
  public: boolean;
  default_permissions: Record<string, string>;
  default_events: string[];
  request_oauth_on_install: boolean;
  callback_urls: string[];
};
const everything = Object.fromEntries(live.settings.map(({ name }) => [name, "x"]));

describe("the live settings", () => {
  it("name, for each live eval, exactly the settings that are missing", () => {
    expect(live.missing("live:email/round-trip", {})).toEqual(live.needs("live:email/round-trip"));
    expect(live.missing("live:email/round-trip", { ...everything, LIVE_MAILBOX_TOKEN: "", LIVE_ALLOWED_MAILBOX: undefined })).toEqual([
      "LIVE_MAILBOX_TOKEN",
      "LIVE_ALLOWED_MAILBOX",
    ]);
    expect(live.skipped(everything)).toEqual([]);
    expect(live.skipped({}).map(({ id }) => id)).toEqual([...LIVE_IDS]);
  });

  it("are listed, by name only, in .dev.vars.example", () => {
    const names = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gmu)];
    expect(names.map(([, name]) => name).sort()).toEqual(live.settings.map(({ name }) => name).sort());
    expect(names.every(([, , value]) => value === "")).toBe(true);
  });
});

describe("the GitHub App manifest", () => {
  it("asks for exactly the permissions and events of the book's section 3", () => {
    expect(manifest.name).toBe("Co-worker (staging)");
    expect(manifest.default_permissions).toEqual({
      issues: "write",
      pull_requests: "write",
      contents: "read",
      checks: "read",
      metadata: "read",
    });
    expect([...manifest.default_events].sort()).toEqual([
      "check_run",
      "issue_comment",
      "issues",
      "pull_request",
      "pull_request_review",
      "push",
    ]);
    expect(manifest.public).toBe(false);
    expect(manifest.request_oauth_on_install).toBe(true);
    expect(manifest.callback_urls).toEqual(["https://REPLACE_AT_DEPLOY/github/installed"]);
    expect("setup_url" in manifest).toBe(false);
    expect(JSON.stringify(manifest)).not.toMatch(/secret|private_key|@/u);
  });
});

/** The staging block before anything is filled in. The real file is filled in by `pnpm staging --apply` and committed. */
const empty = `{
  "d1_databases": [{ "database_id": "0000" }],
  "env": { "staging": {
    "vars": { "DT_APP_URL": "REPLACE_AT_DEPLOY:x", "DT_MAIL_DOMAIN": "REPLACE_AT_DEPLOY:x", "DT_SEND_FROM": "REPLACE_AT_DEPLOY:x" },
    // Kept.
    "routes": [{ "pattern": "REPLACE_AT_DEPLOY:staging.<test domain>" }, { "pattern": "REPLACE_AT_DEPLOY:fake-model.<test domain>" }],
    "d1_databases": [{ "database_id": "REPLACE_AT_DEPLOY:x" }],
    "secrets_store_secrets": [{ "store_id": "REPLACE_AT_DEPLOY:x" }]
  } }
}`;
const STORE = "c".repeat(32);

/** A rule as `wrangler email routing rules list` prints it. */
const ruleOf = (address: string, enabled = "true", worker = "coworker-mailbox"): string =>
  `Rule: abc\n  Name:     x\n  Enabled:  ${enabled}\n  Matchers: to:${address}\n  Actions:  worker:${worker}\n  Priority: 0\n`;

describe("the staging plan", () => {
  const withToken = { CLOUDFLARE_API_TOKEN: "set" };
  const filled = live.fill(empty, { domain: "example.com", databaseId: "db-1", storeId: STORE });

  it("finds the placeholders of the staging block, and none is outside it in the real config", () => {
    expect(live.plan({ config: empty, settings: withToken }).placeholders).toEqual(
      expect.arrayContaining(["database_id", "store_id", "DT_APP_URL", "DT_MAIL_DOMAIN", "pattern"]),
    );
    expect(live.plan({ config: filled, settings: withToken }).placeholders).toEqual([]);
    expect(config.slice(0, config.indexOf('"staging"'))).not.toMatch(/"REPLACE_AT_DEPLOY/u);
  });

  it("fills in what it knows, and leaves what it does not and what is written already", () => {
    expect(filled).toContain('"DT_APP_URL": "https://staging.example.com"');
    expect(filled).toContain('"pattern": "staging.example.com"');
    expect(filled).toContain('"pattern": "fake-model.example.com"');
    expect(filled).toContain("// Kept.");
    expect(filled).toContain('"database_id": "0000"');
    expect(live.fill(filled, { domain: "other.example", databaseId: "db-2", storeId: "s" })).toBe(filled);
    expect(live.plan({ config: live.fill(empty, {}), settings: withToken }).placeholders).toHaveLength(7);
    // The real files have every place the filling knows.
    const real = live.fill(config + fakeModel + mailbox, {
      domain: "example.com",
      databaseId: "db-1",
      storeId: STORE,
      accountId: "a".repeat(32),
    });
    expect(live.plan({ config: real, settings: withToken }).placeholders).toEqual([]);
  });

  it("names the account in the image only when there is exactly one, and says when it is missing", () => {
    const image = '"staging": { "image": "registry.cloudflare.com/REPLACE_AT_DEPLOY/coworker-sandbox@sha256:1" }';
    const none = { databases: "", stores: "", buckets: "", secrets: "", rules: "" };
    const row = (letter: string): string => `│ An account │ ${letter.repeat(32)} │\n`;
    expect(live.found({ ...none, whoami: row("a") }).accountId).toBe("a".repeat(32));
    expect(live.found({ ...none, whoami: row("a") + row("b") }).accountId).toBeUndefined();
    expect(live.fill(image, { accountId: "a".repeat(32) })).toContain(`registry.cloudflare.com/${"a".repeat(32)}/coworker-sandbox@`);
    expect(live.plan({ config: image, settings: withToken }).placeholders).toEqual(["image"]);
  });

  it("runs nothing without a way in, and only the create steps while a placeholder or a secret is missing", () => {
    expect(live.runnable(live.plan({ config: filled, settings: {} }))).toEqual([]);
    const early = live.runnable(live.plan({ config: empty, settings: { ...everything, CLOUDFLARE_API_TOKEN: "" }, signedIn: true }));
    expect(early.map(({ argv }) => argv.slice(3, 5).join(" "))).toEqual(["d1 create", "r2 bucket", "secrets-store store"]);
    const noSecrets = live.plan({ config: filled, settings: withToken });
    expect(live.runnable(noSecrets)).toHaveLength(3);
    expect(noSecrets.absent).toEqual(expect.arrayContaining(["VAULT_MASTER_KEY", "BETTER_AUTH_SECRET"]));
    const later = live.runnable(live.plan({ config: filled, settings: everything }));
    expect(later.some(({ argv, env }) => argv[3] === "deploy" && env === undefined)).toBe(true);
    expect(later.some(({ env }) => env?.["CLOUDFLARE_ENV"] === "staging")).toBe(true);
  });

  it("leaves out what the account has, so a second run never makes it again or replaces the master key", () => {
    const found = live.found({
      databases: JSON.stringify([
        { name: "other", uuid: "no" },
        { name: "coworker-control-staging", uuid: "db-1" },
      ]),
      stores: `│ Name │ ID │\n│ default_secrets_store │ ${STORE} │ ${"e".repeat(32)} │`,
      buckets: "name:           coworker-files-staging\ncreation_date:  x",
      secrets: "│ coworker-staging-vault-master-key │ id │",
      rules:
        ["person", "stranger"].map((name) => ruleOf(`${name}@example.com`)).join("\n") +
        ruleOf("launch.live@example.com", "true", "coworker-staging"),
    });
    expect(found).toEqual({
      databaseId: "db-1",
      storeId: STORE,
      bucket: true,
      masterKey: true,
      mailboxes: addressesOn("example.com"),
      manager: true,
    });
    const titles = live
      .runnable(live.plan({ config: filled, settings: { ...everything, LIVE_STAGING_URL: "https://staging.example.com" }, found }))
      .map(({ title }) => title);
    expect(titles.filter((title) => /^Create the (?!control-plane tables)|master key|^Send /u.test(title))).toEqual([]);
    expect(live.found({ databases: "not json", stores: "", buckets: "", secrets: "", rules: "No routing rules found." })).toEqual({
      bucket: false,
      masterKey: false,
      mailboxes: [],
      manager: false,
    });
  });

  it("gives secrets on a command's input by name, never in a command, and uses the store id written in the config", () => {
    const { steps } = live.plan({
      config: filled,
      settings: Object.fromEntries(live.settings.map(({ name }) => [name, `value-of-${name}`])),
    });
    const commands = steps.flatMap((step) => (step.kind === "command" ? [step] : []));
    expect(JSON.stringify(commands)).not.toContain("value-of-");
    expect(commands.some(({ argv }) => argv.includes("--value"))).toBe(false);
    const key = commands.find(({ argv }) => argv.includes(STORE));
    expect([key?.argv.includes("coworker-staging-vault-master-key"), key?.stdin]).toEqual([true, ["VAULT_MASTER_KEY"]]);
    expect(commands.find(({ argv }) => argv.includes("bulk"))?.stdin).toEqual(
      expect.arrayContaining(["BETTER_AUTH_SECRET", "GITHUB_APP_CLIENT_SECRET"]),
    );
  });

  it("sends the two people's mail to their mailboxes, once, and gives the Worker its token on its input", () => {
    const settings = { ...everything, LIVE_STAGING_URL: "https://staging.example.com" };
    const commands = (rules: string) =>
      live.runnable(
        live.plan({
          config: filled,
          settings,
          found: live.found({ databases: "", stores: "", buckets: "", secrets: "", rules }),
        }),
      );
    const toMailbox = (rules: string) =>
      commands(rules).flatMap(({ argv }) =>
        argv.includes("create") && argv.includes("coworker-mailbox") ? [argv[argv.indexOf("--match-value") + 1]] : [],
      );
    expect(toMailbox("")).toEqual(addressesOn("example.com"));
    expect(toMailbox(ruleOf("person@example.com"))).toEqual(["stranger@example.com"]);
    // One that is off, or goes elsewhere, is not the rule.
    expect(toMailbox(ruleOf("person@example.com", "false") + ruleOf("stranger@example.com", "true", "coworker-staging"))).toHaveLength(2);
    const token = commands("").find(({ argv }) => argv.includes("MAILBOX_TOKEN"));
    expect([token?.argv.includes("wrangler.mailbox.jsonc"), token?.stdin]).toEqual([true, ["LIVE_MAILBOX_TOKEN"]]);
    const all = commands("");
    // The test manager's address has its own rule; wrangler cannot send the catch-all to a Worker, so that one is by hand.
    const toStaging = all.filter(({ argv }) => argv.includes("--match-value") && argv.at(-1) === "coworker-staging");
    expect(toStaging.map(({ argv }) => argv[argv.indexOf("--match-value") + 1])).toEqual(["launch.live@example.com"]);
    expect(all.some(({ argv }) => argv.includes("catch-all"))).toBe(false);
    expect(JSON.stringify(all)).not.toMatch(/@live\.example\.com|"sending"/u);
    // Wrangler is told not to write what it makes into the config: it would be a remote binding of the local app.
    const makes = all.filter(({ argv }) => argv.includes("create") && (argv.includes("d1") || argv.includes("r2")));
    expect(makes.map(({ argv }) => argv.at(-1))).toEqual(["--update-config=false", "--update-config=false"]);
    const tables = all.find(({ argv }) => argv.includes("migrations"));
    expect(tables?.argv.slice(-2)).toEqual(["--env", "staging"]);
    const titles = all.map(({ title }) => title);
    expect(titles.indexOf("Deploy coworker-mailbox")).toBeLessThan(titles.indexOf("Set the token of coworker-mailbox"));
  });

  it("is only printed unless apply is asked for", () => {
    const dry = live.describe(live.plan({ config: empty, settings: withToken }), false);
    expect(dry).toContain("Dry run: nothing was run. Add --apply");
    expect(dry).not.toContain("[runs]");
    const applied = live.describe(live.plan({ config: empty, settings: withToken }), true);
    expect(applied).toContain("[runs]");
    expect(applied).toContain("[waits for what is missing below]");
    expect(live.describe(live.plan({ config: empty, settings: {} }), true)).toContain("Blocked: wrangler is not signed in");
  });
});
