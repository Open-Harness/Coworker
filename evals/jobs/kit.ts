import { flow, until, world, type Flow, type Repo } from "../flows/kit.ts";
import type { Job } from "./job.ts";

/* A workspace that has two connections: the scripted one of the flows, and a real one. */

interface Settings {
  readonly doer?: string;
  readonly reviewer?: string;
  readonly judge?: string;
  readonly thinking: string;
}

export interface Real extends Flow {
  /** `<connection> <model> <thinking>`, as a blank is filled. */
  readonly real: { readonly doer: string; readonly reviewer: string; readonly judge: string };
  readonly scripted: { readonly doer: string; readonly reviewer: string; readonly judge: string };
}

export async function real(): Promise<Real> {
  const set = await world<Settings>("/jobs");
  if (set.doer === undefined) throw new Error("Set JOBS_BASE_URL, JOBS_KEY and JOBS_MODEL (an OpenAI-compatible endpoint, its key, a model)");
  const f = await flow();
  await f.ama.browser.send("POST", `/api/workspaces/${f.ama.workspace}/models`, { source: "endpoint", label: "Real", baseUrl: "https://models.jobs.test/v1", key: "added-outside" });
  const connection = (await f.ama.see("/settings/keys")).models.find(({ label }) => label === "Real")?.id ?? "";
  const of = (model: string | undefined): string => `${connection} ${model} ${set.thinking}`;
  const by = (model: string): string => `${f.connection} ${model} low`;
  return Object.assign(f, {
    real: { doer: of(set.doer), reviewer: of(set.reviewer), judge: of(set.judge) },
    scripted: { doer: by(f.models.doer), reviewer: by(f.models.reviewer), judge: by(f.models.judge) },
  });
}

export const asked = (f: Flow, repo: Repo, job: Job) => repo.does("issue", { by: f.ama.login, ...job.issue, labels: ["juno"] });
export const hidden = (repo: Repo, branch: string, job: Job) => repo.does<{ ok: boolean; says: string }>("run", { branch, files: job.hidden, command: job.test });
export const pulled = (repo: Repo, ms: number) => until(repo, () => repo.pulls(), (pulls) => pulls.length > 0, "a pull request is open", ms);
