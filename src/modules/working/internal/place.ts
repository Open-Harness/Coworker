import type { Found } from "~/modules/boxes/service.ts";
import type { Outside, Store } from "../types.ts";
import { defaultBranch } from "./github.ts";
import { branchFor } from "./thread.ts";

const SIZE = "1 vCPU · 2 GB" as const;
const ONE_CLONE = { contents: "read" } as const;

/** What a work's container is made from: a clone of its repo on its own branch, with a token that can only read, made for it now and kept nowhere. */
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
    const base = await defaultBranch(outside, repo);
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
