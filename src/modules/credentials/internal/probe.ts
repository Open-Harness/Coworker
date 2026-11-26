import type { Probe, Problem, Run } from "../types.ts";

/** The outside person on GitHub, as this module needs them: does the token reach the repo? */
export interface People {
  readonly github: (token: string, repo: string) => Promise<string | undefined>;
}

const problem = (reason: string | undefined): Problem | undefined => (reason === undefined ? undefined : { _tag: "Problem", reason });

/** Asks Cloudflare and GitHub whether an answer works. Nothing is changed anywhere. */
export function liveProbe(run: Run, people: People): Probe {
  return async (name, values) => {
    if (name === "TEST_DOMAIN") {
      const found = await run(["pnpm", "exec", "wrangler", "email", "routing", "settings", values[name] ?? ""]);
      return problem(found.code === 0 ? undefined : "Cloudflare does not have this domain in the account wrangler is signed in to");
    }
    if (name === "TEST_ORG") {
      const found = await run(["gh", "api", `orgs/${values[name] ?? ""}`, "--jq", ".login"]);
      return problem(found.code === 0 ? undefined : "GitHub has no such organization, or gh is not signed in to see it");
    }
    if (name === "GH_PERSON_TOKEN") return problem(await people.github(values[name] ?? "", values["LIVE_GITHUB_REPO"] ?? ""));
    return undefined;
  };
}
