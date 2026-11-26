import { expect, type Page } from "@playwright/test";
import { sign } from "@octokit/webhooks-methods";
import { createRequire } from "node:module";
import type { Team } from "./team.ts";

/* What arrives from outside, the real way: mail through the Worker's email handler (the fake world's entry beside
   /api/test/mail) and GitHub's webhooks, signed with the fake world's secret. */

const examples = createRequire(import.meta.url)("@octokit/webhooks-examples") as { name: string; examples: object[] }[];

/** The signing secret of the fake world's GitHub App. */
const SECRET = "fake-github-webhook-secret";

/** The address of a manager, as mail to it is sent. */
export async function managerAddress(launch: Team): Promise<string> {
  const body = (await (await launch.page.request.get(launch.api)).json()) as { manager: { address: string } };
  return body.manager.address;
}

/** Who may ask a manager: everyone at one email domain. Nobody may until someone says so. */
export async function allowDomain(launch: Team, domain: string): Promise<void> {
  const saved = await launch.page.request.put(`${launch.api}/policy`, {
    data: { acceptMode: "observe", allowed: [{ kind: "domain", domain }], admission: {}, bots: [] },
  });
  expect(saved.ok(), `policy answered ${saved.status()}`).toBe(true);
}

/** Mail arriving for an address. `dkim: false` is a sender whose domain does not vouch for them. */
export async function inboundMail(
  page: Page,
  mail: { from: string; to: string; subject: string; text: string; messageId?: string; dkim?: boolean },
): Promise<{ _tag: string }> {
  const response = await page.request.post("/api/test/inbound-mail", { data: mail });
  expect(response.ok(), `inbound mail answered ${response.status()}`).toBe(true);
  return (await response.json()) as { _tag: string };
}

/** The installation the workspace has claimed, as the App's webhooks name it. */
async function installationOf(launch: Team): Promise<number> {
  const body = (await (await launch.page.request.get(`/api/workspaces/${launch.workspaceId}/github`)).json()) as {
    github: { installation: { id: number } };
  };
  return body.github.installation.id;
}

async function deliver(page: Page, event: string, delivery: string, payload: object): Promise<void> {
  const body = JSON.stringify(payload);
  const sent = await page.request.post("/in/github", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-github-delivery": delivery,
      "x-hub-signature-256": await sign(SECRET, body),
    },
  });
  expect(sent.ok(), `${event} ${delivery} answered ${sent.status()}`).toBe(true);
}

/** A pull request opened on `acme/web` by someone, signed as GitHub signs it. */
export async function pullRequestOpened(launch: Team, delivery: string, title: string, sender = "stranger"): Promise<void> {
  const pull = examples
    .find(({ name }) => name === "pull_request")
    ?.examples.find((one) => (one as { action?: string }).action === "opened") as { pull_request: object } | undefined;
  await deliver(launch.page, "pull_request", delivery, {
    ...pull,
    pull_request: { ...pull?.pull_request, title, body: "" },
    installation: { id: await installationOf(launch) },
    repository: { full_name: "acme/web", name: "web", owner: { login: "acme" } },
    sender: { id: 77, login: sender, type: "User" },
  });
}

/** GitHub telling the App it was uninstalled. */
export async function uninstalled(launch: Team, delivery: string): Promise<void> {
  const removed = examples
    .find(({ name }) => name === "installation")
    ?.examples.find((one) => (one as { action?: string }).action === "deleted");
  await deliver(launch.page, "installation", delivery, { ...removed, installation: { id: await installationOf(launch) } });
}
