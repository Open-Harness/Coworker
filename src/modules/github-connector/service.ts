import { verify } from "@octokit/webhooks-methods";
import { githubEvents } from "~/modules/github-events/service.ts";
import type { Raw } from "~/modules/connectors/types.ts";
import { itemOf } from "./internal/item.ts";
import type { Delivered, GithubConnector } from "./types.ts";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** The installation a payload names, as far as it says one. It is only believed after the signature held. */
function installationOf(payload: unknown): number | null {
  const named = isRecord(payload) && isRecord(payload["installation"]) ? payload["installation"]["id"] : undefined;
  return typeof named === "number" ? named : null;
}

/** The App was suspended, not uninstalled: GitHub says so in the action of the installation event. */
const suspendedBy = (event: string | undefined, payload: unknown): boolean =>
  event === "installation" && isRecord(payload) && payload["action"] === "suspend";

const refused = (why: "not signed" | "not ours" | "broken", installation: number | null = null): Delivered => ({
  _tag: "Refused",
  why,
  installation,
});

export const githubConnector: GithubConnector = {
  receive: async (raw: Raw, secret, usFor) => {
    const signature = raw.headers["x-hub-signature-256"];
    const signed = secret !== "" && signature !== undefined && (await verify(secret, raw.body, signature).catch(() => false));
    if (!signed) return refused("not signed");
    const payload: unknown = (() => {
      try {
        return JSON.parse(raw.body);
      } catch {
        return undefined;
      }
    })();
    const installation = installationOf(payload);
    const us = await usFor(installation);
    const read = githubEvents.read(raw.headers["x-github-event"] ?? "", payload, us);
    switch (read._tag) {
      case "Heard":
        return {
          _tag: "Item",
          item: itemOf(read),
          follows: [],
          installation: read.installation ?? installation,
          heard: { repo: read.repo, event: read.event, records: read.records, numbers: read.numbers, sha: read.sha, us },
        };
      case "Account":
        return {
          _tag: "Account",
          says: read.says,
          works: read.works,
          installation: read.installation,
          suspended: suspendedBy(raw.headers["x-github-event"], payload),
        };
      case "Noise":
        return {
          _tag: "Noise",
          why: read.why,
          installation,
          ...(read.repo === null ? {} : { heard: { repo: read.repo, event: "noise", records: read.records, numbers: [], sha: null, us } }),
        };
      case "Broken":
        return refused("broken", installation);
    }
  },
};
