import type { LiveId } from "../types.ts";

/** Every name the live tier and staging setup use, with what it is. `.dev.vars.example` lists exactly these. */
export const SETTINGS: readonly { readonly name: string; readonly about: string }[] = [
  // The live runner (tests). It signs in to staging as the allowed mailbox, which is the test workspace's Owner.
  { name: "LIVE_STAGING_URL", about: "Where staging is, such as https://staging.<test domain>" },
  { name: "LIVE_MAILBOX_URL", about: "Where the two people's mailboxes are, such as https://mailbox.<test domain>" },
  { name: "LIVE_MAILBOX_TOKEN", about: "Reads and sends as the two mailboxes. The coworker-mailbox Worker's secret MAILBOX_TOKEN" },
  {
    name: "LIVE_ALLOWED_MAILBOX",
    about: "The mailbox of the allowed person, who is also the test workspace's Owner: person@<test domain>",
  },
  { name: "LIVE_STRANGER_MAILBOX", about: "The mailbox of the stranger: stranger@<test domain>" },
  { name: "LIVE_FAKE_MODEL_URL", about: "The coworker-fake-model endpoint the test workspace uses, ending in /v1" },
  { name: "GH_PERSON_TOKEN", about: "Fine-grained token of the GitHub machine user, for the sandbox repo only" },
  { name: "LIVE_GITHUB_REPO", about: "The test repo, such as <test org>/sandbox" },
  { name: "LIVE_APP_SLUG", about: "The staging GitHub App's slug, which an issue mentions" },
  // Deploying staging (scripts/staging.ts).
  {
    name: "CLOUDFLARE_API_TOKEN",
    about: "Optional: for deploying from a computer where wrangler is not signed in, such as a nightly job",
  },
  // Secrets of the staging Worker, handed to wrangler on its standard input (the book's GH_* names are these GITHUB_* ones).
  { name: "BETTER_AUTH_SECRET", about: "Staging Worker secret: signs sessions, at least 32 characters" },
  { name: "GITHUB_APP_ID", about: "Staging Worker secret: the GitHub App's id (the book's GH_APP_ID)" },
  { name: "GITHUB_APP_SLUG", about: "Staging Worker secret: the GitHub App's slug" },
  { name: "GITHUB_APP_PRIVATE_KEY", about: "Staging Worker secret: the App's key as PKCS #8 PEM (the book's GH_APP_PRIVATE_KEY)" },
  {
    name: "GITHUB_APP_CLIENT_ID",
    about: "Staging Worker secret: the App's client id, for the proof step when a workspace connects an installation",
  },
  { name: "GITHUB_APP_CLIENT_SECRET", about: "Staging Worker secret: the App's client secret, for the same proof step" },
  { name: "GITHUB_WEBHOOK_SECRET", about: "Staging Worker secret: the App's webhook secret (the book's GH_WEBHOOK_SECRET)" },
  { name: "VAULT_MASTER_KEY", about: "Staging's Secrets Store secret: 32 bytes in base64. Made once; a new one loses every vault" },
  { name: "FAKE_MODEL_KEY", about: "Optional secret of the coworker-fake-model Worker" },
  { name: "ANTHROPIC_API_KEY", about: "Optional: the nightly smoke test with a real model" },
];

/** What each live eval needs before it can run. */
const APP = ["LIVE_STAGING_URL", "LIVE_MAILBOX_URL", "LIVE_MAILBOX_TOKEN", "LIVE_ALLOWED_MAILBOX", "LIVE_FAKE_MODEL_URL"];

export const NEEDS: Readonly<Record<LiveId, readonly string[]>> = {
  "live:email/round-trip": APP,
  "live:email/stranger": [...APP, "LIVE_STRANGER_MAILBOX"],
  "live:github/round-trip": [...APP, "GH_PERSON_TOKEN", "LIVE_GITHUB_REPO", "LIVE_APP_SLUG"],
  "live:sandbox/clone-test": [...APP, "GH_PERSON_TOKEN", "LIVE_GITHUB_REPO"],
};
