import { until, type Flow, type Repo } from "./kit.ts";
import { checksAlways, fixes, takes } from "./scripts.ts";

/* A manager on a repo whose models take every issue to a pull request, and the first steps of most flows. */

export interface Ready {
  readonly repo: Repo;
  readonly manager: string;
}

export async function ready(f: Flow, answers: Readonly<Record<string, string>> = {}, more: object = {}): Promise<Ready> {
  const repo = await f.repo(undefined, more);
  const manager = await f.manager(repo, answers);
  await f.script(f.models.judge, [takes(manager)]);
  await f.script(f.models.doer, fixes);
  await f.script(f.models.reviewer, checksAlways());
  return { repo, manager };
}

export const asks = (f: Flow, repo: Repo, more: object = {}): Promise<{ number: number }> =>
  repo.does("issue", { by: f.ama.login, title: "add.sh subtracts", body: "sh add.sh 1 2 answers -1", labels: ["juno"], ...more });

export const pulled = (repo: Repo): Promise<any[]> => until(repo, () => repo.pulls(), (pulls) => pulls.length > 0, "a pull request is open");

/** Asked, built, checked, and its pull request waits for a person. */
export async function opened(f: Flow, answers: Readonly<Record<string, string>> = {}): Promise<Ready & { readonly pull: number; readonly branch: string; readonly work: string }> {
  const { repo, manager } = await ready(f, answers);
  await asks(f, repo);
  const [pull] = await pulled(repo);
  const { cards } = await until(repo, () => f.ama.see("/m/:manager/board", { manager }), (board) => board.cards[0]?.work.step === "review", "it is with a person");
  return { repo, manager, pull: pull.number, branch: pull.pull.head.ref, work: cards[0]?.work.id ?? "" };
}

export const workOf = (f: Flow, manager: string, work: string) => f.ama.see("/m/:manager/work/:work", { manager, work });

/** What waits for this person, open. */
export async function waiting(person: Flow["ama"]) {
  return (await person.see("/inbox")).items.filter(({ ask }) => ask.state._tag === "Open").map(({ ask }) => ask);
}
