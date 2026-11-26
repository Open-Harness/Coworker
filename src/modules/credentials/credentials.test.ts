import { describe, expect, it } from "vitest";
import { live } from "~/modules/live/service.ts";
import { addressesOn } from "~/modules/mailbox/types.ts";
import manifest from "~/../live/github-app-manifest.json?raw";
import { bitwarden, createCredentials, ensureRepo, isProblem, liveProbe } from "./service.ts";
import { fakeStore } from "./testing.ts";
import type { CredentialsDependencies, Run, Values } from "./types.ts";

const made = (had: Values = {}, more: Partial<CredentialsDependencies> = {}) => {
  const store = fakeStore(had);
  let count = 0;
  const credentials = createCredentials({
    store,
    manifest,
    probe: async () => undefined,
    random: (bytes) => `random-${bytes}-${(count += 1)}`,
    pkcs8: (pem) => `pkcs8(${pem})`,
    ...more,
  });
  return { store, credentials };
};
const conversion = { id: 7, slug: "dt", client_id: "Iv1", client_secret: "cs", webhook_secret: "wh", pem: "RSA" };

describe("the list", () => {
  it("has every setting a live test needs, and says only whether each is there", async () => {
    const { credentials } = made({ GH_PERSON_TOKEN: "secret-value" });
    const names = credentials.all.map(({ name }) => name);
    const needed = new Set(live.skipped({}).flatMap(({ missing }) => missing));
    expect(names).toEqual(expect.arrayContaining([...needed]));
    expect(names).toEqual(expect.arrayContaining([...live.plan({ config: "", settings: {} }).absent]));
    const rows = await credentials.list();
    expect(rows).toContainEqual(expect.objectContaining({ name: "GH_PERSON_TOKEN", there: true }));
    expect(JSON.stringify(rows)).not.toContain("secret-value");
  });

  it("asks a person for three things, and not for what is there", async () => {
    const asked = async (had: Values) => {
      const all = await made(had).credentials.toAsk();
      return isProblem(all) ? [] : all.map(({ name }) => name);
    };
    expect(await asked({})).toHaveLength(3);
    expect(await asked({ TEST_ORG: "x" })).not.toContain("TEST_ORG");
  });
});

describe("an answer", () => {
  it("has a page with what is known filled in", async () => {
    const { credentials } = made({ TEST_ORG: "acme" });
    const pages = await Promise.all(credentials.all.map(credentials.page));
    expect(pages.filter((page) => page?.includes("target_name=acme&issues=write"))).toHaveLength(1);
    expect(pages.join(" ")).not.toContain("{");
  });

  it("waits for what it is checked against", async () => {
    const { credentials } = made();
    const token = credentials.all.filter(({ name }) => name === "GH_PERSON_TOKEN");
    expect(await Promise.all(token.map(credentials.waitsFor))).toEqual([["TEST_ORG"]]);
    expect(await Promise.all(token.map(made({ TEST_ORG: "acme" }).credentials.waitsFor))).toEqual([[]]);
  });

  it("is tidied and kept with what follows from it", async () => {
    const { store, credentials } = made();
    await credentials.answer("TEST_DOMAIN", " https://Example.com/ ");
    await credentials.answer("TEST_ORG", "https://github.com/acme");
    expect(store.values).toEqual({
      TEST_DOMAIN: "example.com",
      LIVE_STAGING_URL: "https://staging.example.com",
      LIVE_FAKE_MODEL_URL: "https://fake-model.example.com/v1",
      LIVE_MAILBOX_URL: "https://mailbox.example.com",
      LIVE_ALLOWED_MAILBOX: addressesOn("example.com")[0],
      LIVE_STRANGER_MAILBOX: addressesOn("example.com")[1],
      TEST_ORG: "acme",
      LIVE_GITHUB_REPO: "acme/sandbox",
    });
  });

  it("is not kept when it cannot be right or its service refuses it, and the reason never repeats it", async () => {
    const refusing = made({}, { probe: async () => ({ _tag: "Problem", reason: "GitHub answered 401" }) });
    for (const [name, typed] of [
      ["TEST_DOMAIN", "example dot com"],
      ["TEST_ORG", "a/b"],
      ["GH_PERSON_TOKEN", "two words"],
      ["GH_PERSON_TOKEN", "  "],
      ["GH_PERSON_TOKEN", "github_pat_x"],
    ] as const) {
      const kept = await refusing.credentials.answer(name, typed);
      expect(isProblem(kept) && (typed.trim() === "" || !kept.reason.includes(typed))).toBe(true);
    }
    expect(refusing.store.values).toEqual({});
  });

  it("is checked with the service it belongs to", async () => {
    const asked: string[] = [];
    const run: Run = async (argv) => {
      asked.push(argv.join(" "));
      return { code: argv.includes("gone.com") || argv.includes("orgs/gone") ? 1 : 0, stdout: "", stderr: "" };
    };
    const probe = liveProbe(run, {
      github: async (token, repo) => (token === "good" && repo === "acme/sandbox" ? undefined : "no"),
    });
    expect(await probe("TEST_DOMAIN", { TEST_DOMAIN: "example.com" })).toBeUndefined();
    expect(await probe("TEST_DOMAIN", { TEST_DOMAIN: "gone.com" })).toBeDefined();
    expect(await probe("TEST_ORG", { TEST_ORG: "gone" })).toBeDefined();
    expect(await probe("GH_PERSON_TOKEN", { GH_PERSON_TOKEN: "good", LIVE_GITHUB_REPO: "acme/sandbox" })).toBeUndefined();
    expect(asked.join(" ")).not.toContain("good");
  });
});

describe("the ones nobody types", () => {
  it("are made once: a master key that is there is never made again", async () => {
    const { store, credentials } = made();
    await credentials.make();
    const first = { ...store.values };
    expect(first).toEqual({ BETTER_AUTH_SECRET: "random-48-1", VAULT_MASTER_KEY: "random-32-2", LIVE_MAILBOX_TOKEN: "random-32-3" });
    await credentials.make();
    expect(store.values).toEqual(first);
  });

  it("are worked out from answers kept before, and one that is there stays, except a mailbox", async () => {
    const { store, credentials } = made({
      TEST_DOMAIN: "example.com",
      TEST_ORG: "acme",
      LIVE_STAGING_URL: "https://elsewhere.test",
      LIVE_STRANGER_MAILBOX: "me@elsewhere.test",
    });
    await credentials.make();
    expect(store.values).toMatchObject({
      LIVE_STAGING_URL: "https://elsewhere.test",
      LIVE_MAILBOX_URL: "https://mailbox.example.com",
      LIVE_ALLOWED_MAILBOX: "person@example.com",
      LIVE_STRANGER_MAILBOX: "stranger@example.com",
      LIVE_GITHUB_REPO: "acme/sandbox",
    });
  });

  it("come from GitHub when the App is made", async () => {
    const { store, credentials } = made();
    expect(await credentials.app("http://127.0.0.1:1/made")).toMatchObject({ _tag: "Problem" });
    await credentials.answer("TEST_DOMAIN", "example.com");
    await credentials.answer("TEST_ORG", "acme");
    const form = await credentials.app("http://127.0.0.1:1/made");
    if (isProblem(form)) throw new Error(form.reason);
    expect(form.action).toBe("https://github.com/organizations/acme/settings/apps/new");
    expect(JSON.parse(form.manifest)).toMatchObject({
      redirect_url: "http://127.0.0.1:1/made",
      callback_urls: ["https://staging.example.com/github/installed"],
      hook_attributes: { url: "https://staging.example.com/in/github" },
    });
    expect(await credentials.keepApp({ ...conversion, pem: undefined })).toMatchObject({ _tag: "Problem" });
    expect(await credentials.keepApp(undefined)).toMatchObject({ _tag: "Problem" });
    await credentials.keepApp(conversion);
    expect(store.values).toMatchObject({ GITHUB_APP_ID: "7", LIVE_APP_SLUG: "dt", GITHUB_APP_PRIVATE_KEY: "pkcs8(RSA)" });
  });
});

/** Bitwarden's `bw`, as far as this module uses it. */
function fakeBw(trouble?: string, before: readonly Record<string, unknown>[] = []) {
  let items: Record<string, unknown>[] = [
    ...before,
    { id: "x", name: "Co-worker staging (old)", fields: [{ name: "TEST_ORG", value: "no" }] },
  ];
  const seen: string[] = [];
  const run: Run = async (argv, stdin) => {
    seen.push(argv.join(" "));
    if (trouble !== undefined) return { code: 1, stdout: "", stderr: trouble };
    const call = argv.slice(1, 3).join(" ");
    const given =
      stdin === undefined ? {} : (JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(stdin), (c) => c.charCodeAt(0)))) as object);
    if (call === "create item") items = [...items, { ...given, id: "new" }];
    if (call === "edit item") items = items.map((one) => (one["id"] === argv[3] ? { ...given, id: argv[3] } : one));
    const saved = call === "edit item" ? items.find((one) => one["id"] === argv[3]) : items.at(-1);
    return { code: 0, stdout: JSON.stringify(call === "list items" ? items : saved), stderr: "" };
  };
  return { run, seen };
}

describe("Bitwarden", () => {
  it("makes the item once, then edits it, and never puts a value in an argument", async () => {
    const { run, seen } = fakeBw();
    const store = bitwarden(run);
    expect(await store.read()).toEqual({});
    expect(await store.write({ TEST_ORG: "acmé", GITHUB_APP_PRIVATE_KEY: "line one\nline two\n" })).toMatchObject({ _tag: "Written" });
    // Another run, with nothing in memory.
    const again = bitwarden(run);
    await again.write({ GH_PERSON_TOKEN: "s3cret", TEST_ORG: "other" });
    expect(await bitwarden(run).read()).toEqual({
      TEST_ORG: "other",
      GITHUB_APP_PRIVATE_KEY: "line one\nline two\n",
      GH_PERSON_TOKEN: "s3cret",
    });
    expect(seen.filter((one) => one.startsWith("bw create"))).toHaveLength(1);
    expect(seen).toContain("bw edit item new");
    expect(seen.join("\n")).not.toMatch(/s3cret|line one|other/u);
  });

  it("says what to do when it is not signed in, and when it did not keep a value", async () => {
    expect(await bitwarden(fakeBw("You are not logged in.").run).read()).toMatchObject({
      reason: expect.stringContaining("bw login") as string,
    });
    const forgets: Run = async (argv) => ({ code: 0, stdout: argv[1] === "list" ? "[]" : "{}", stderr: "" });
    expect(await bitwarden(forgets).write({ TEST_ORG: "acme" })).toMatchObject({ reason: "Bitwarden did not keep TEST_ORG as given" });
  });

  it("finds the note under the product's old name, keeps what it holds and gives it the new one", async () => {
    const old = { id: "old", name: "Durable Teams staging", fields: [{ name: "TEST_ORG", value: "acme" }] };
    const { run, seen } = fakeBw(undefined, [old]);
    expect(await bitwarden(run).read()).toEqual({ TEST_ORG: "acme" });
    await bitwarden(run).write({ TEST_DOMAIN: "example.com" });
    expect(await bitwarden(run).read()).toEqual({ TEST_ORG: "acme", TEST_DOMAIN: "example.com" });
    expect(seen.some((one) => one.startsWith("bw create"))).toBe(false);
    const { name } = (JSON.parse((await run(["bw", "list", "items"])).stdout) as { name: string }[])[0] ?? {};
    expect(name).toBe("Co-worker staging");
  });

  it("does not guess between two items of the same name", async () => {
    const two: Run = async () => ({
      code: 0,
      stdout: JSON.stringify([{ name: "Co-worker staging" }, { name: "Co-worker staging" }]),
      stderr: "",
    });
    expect(await bitwarden(two).read()).toMatchObject({ _tag: "Problem" });
  });
});

describe("the test repo", () => {
  it("is made with its test only where it is missing", async () => {
    const calls: string[] = [];
    const run =
      (there: boolean): Run =>
      async (argv) => {
        calls.push(argv.slice(0, 4).join(" "));
        return { code: argv.includes("PUT") || argv[1] === "repo" || there ? 0 : 1, stdout: "", stderr: "" };
      };
    expect(await ensureRepo(run(false), "acme/sandbox")).toEqual({ _tag: "Ready", made: true });
    expect(calls.filter((one) => one.includes("PUT"))).toHaveLength(2);
    calls.length = 0;
    expect(await ensureRepo(run(true), "acme/sandbox")).toEqual({ _tag: "Ready", made: false });
    expect(calls.some((one) => one.includes("PUT") || one.includes("repo create"))).toBe(false);
  });
});
