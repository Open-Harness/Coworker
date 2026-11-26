import type { Found } from "~/modules/boxes/service.ts";
import type { Outside, Store } from "~/modules/working/types.ts";

/* What a work's box is made from: a clone of its repo on its own branch. */

const SIZE = "1 vCPU · 2 GB" as const;
const ONE_CLONE = { contents: "read" } as const;
const API = "https://api.github.com";

/** The branch a piece of work is done on. */
export const branchFor = (work: string): string => `co-worker/${work}`;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The repo's own default branch, read with a token that can only read its metadata; `main` when it cannot be read. */
async function defaultBranch(outside: Outside, installation: number, repo: string): Promise<string> {
  const made = await outside.github.token(installation, repo, { metadata: "read" });
  if (made._tag === "Failed") return "main";
  const response = await outside
    .fetch(`${API}/repos/${repo}`, {
      headers: { authorization: `Bearer ${made.token.token}`, accept: "application/vnd.github+json", "user-agent": "co-worker" },
    })
    .catch(() => undefined);
  const value: unknown = await response?.json().catch(() => undefined);
  return isRecord(value) && typeof value["default_branch"] === "string" && value["default_branch"] !== ""
    ? value["default_branch"]
    : "main";
}

/** A clone of the work's repo on its own branch, with a token that can only read, made for it now and kept nowhere. */
export const clonePlace =
  (outside: Outside, store: Pick<Store, "work">) =>
  async (workId: string): Promise<Found> => {
    const work = store.work(workId);
    if (work === undefined) return { _tag: "Unavailable", why: `There is no work ${workId}.` };
    const repo = work.from.place;
    const installation = await outside.installation();
    if (installation === undefined) return { _tag: "Unavailable", why: "GitHub is not connected to this workspace." };
    const token = await outside.github.token(installation, repo, ONE_CLONE);
    if (token._tag === "Failed") return { _tag: "Unavailable", why: `GitHub would not give a way to clone ${repo}: ${token.reason}` };
    const base = await defaultBranch(outside, installation, repo);
    return {
      _tag: "Place",
      place: {
        repo,
        base,
        spec: {
          work: workId,
          size: SIZE,
          setUp: "",
          clone: { url: `https://github.com/${repo}.git`, token: token.token.token, branch: branchFor(workId) },
          env: {},
          hosts: [],
        },
      },
    };
  };
