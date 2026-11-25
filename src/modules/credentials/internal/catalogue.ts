import type { Credential } from "../types.ts";

const you = (name: string, about: string, how: string, hidden: boolean, page?: string): Credential => ({
  name,
  about,
  source: { _tag: "You", how, hidden, ...(page === undefined ? {} : { page }) },
});
const from = (_tag: "MadeHere" | "GithubApp" | "WorkedOut", name: string, about: string): Credential => ({ name, about, source: { _tag } });

/** In the order they are asked for. */
export const CATALOGUE: readonly Credential[] = [
  you(
    "TEST_DOMAIN",
    "Your domain, where the trial copy of the app will run",
    "One in your Cloudflare account. It gets staging., fake-model. and mailbox. in front, and two test mailboxes; the website on it is left alone",
    false,
    "https://dash.cloudflare.com/",
  ),
  you("TEST_ORG", "The GitHub organization that owns the test repo and the App", "The organization's name, as in its address", false),
  you(
    "GH_PERSON_TOKEN",
    "The person who opens issues",
    "The page opens filled in. Choose Only select repositories, sandbox, then Generate token. Your own account will do",
    true,
    "https://github.com/settings/personal-access-tokens/new?name=co-worker-person&expires_in=90&target_name={TEST_ORG}&issues=write&pull_requests=write",
  ),
  from("GithubApp", "GITHUB_APP_ID", "The GitHub App's id"),
  from("GithubApp", "GITHUB_APP_SLUG", "The GitHub App's slug"),
  from("GithubApp", "GITHUB_APP_CLIENT_ID", "The GitHub App's client id"),
  from("GithubApp", "GITHUB_APP_CLIENT_SECRET", "The GitHub App's client secret"),
  from("GithubApp", "GITHUB_APP_PRIVATE_KEY", "The GitHub App's private key, PKCS #8"),
  from("GithubApp", "GITHUB_WEBHOOK_SECRET", "The GitHub App's webhook secret"),
  from("GithubApp", "LIVE_APP_SLUG", "The slug an issue mentions"),
  from("MadeHere", "BETTER_AUTH_SECRET", "Signs sessions on staging"),
  from("MadeHere", "VAULT_MASTER_KEY", "Encrypts staging's vaults"),
  from("MadeHere", "LIVE_MAILBOX_TOKEN", "Reads and sends as the two mailboxes"),
  from("WorkedOut", "LIVE_STAGING_URL", "Where staging is"),
  from("WorkedOut", "LIVE_FAKE_MODEL_URL", "Where the test model is"),
  from("WorkedOut", "LIVE_MAILBOX_URL", "Where the two mailboxes are"),
  from("WorkedOut", "LIVE_ALLOWED_MAILBOX", "The mailbox of the person who may ask"),
  from("WorkedOut", "LIVE_STRANGER_MAILBOX", "The mailbox of the stranger"),
  from("WorkedOut", "LIVE_GITHUB_REPO", "The test repo"),
];

/** What follows from an answer, so nobody types it. */
export const FOLLOWS: Readonly<Record<string, (value: string) => Readonly<Record<string, string>>>> = {
  // The addresses are the mailbox module's (`addressesOn`); a test checks that they are the same.
  TEST_DOMAIN: (domain) => ({
    LIVE_STAGING_URL: `https://staging.${domain}`,
    LIVE_FAKE_MODEL_URL: `https://fake-model.${domain}/v1`,
    LIVE_MAILBOX_URL: `https://mailbox.${domain}`,
    LIVE_ALLOWED_MAILBOX: `person@${domain}`,
    LIVE_STRANGER_MAILBOX: `stranger@${domain}`,
  }),
  TEST_ORG: (org) => ({ LIVE_GITHUB_REPO: `${org}/sandbox` }),
};

/** A token is checked against what it must reach. */
export const AFTER: Readonly<Record<string, readonly string[]>> = {
  GH_PERSON_TOKEN: ["TEST_ORG"],
};
