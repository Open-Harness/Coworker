import type { Playbook, Problem, Surroundings } from "../types.ts";

/** What a playbook is checked against, and where to say what is wrong. */
export interface Ctx {
  readonly p: Playbook;
  readonly around: Surroundings;
  readonly say: (at: string, line: string, says: string) => void;
  readonly people: ReadonlySet<string>;
  readonly skills: ReadonlySet<string>;
  readonly tools: ReadonlySet<string>;
  readonly account: (id: string) => Surroundings["accounts"][number] | undefined;
}

export function contextOf(p: Playbook, around: Surroundings, sink: Problem[]): Ctx {
  const here = p.skills.filter((s) => s.from === "here").map((s) => s.id);
  const actions = around.accounts.flatMap((a) => a.actions);
  return {
    p,
    around,
    say: (at, line, says) => void sink.push({ at, line, says }),
    people: new Set(around.people),
    skills: new Set([...here, ...around.skills]),
    tools: new Set([...around.tools, ...actions]),
    account: (id) => around.accounts.find((a) => a.id === id),
  };
}

/** A person, said: there or not. */
export function checkPerson(c: Ctx, at: string, line: string, person: string, what: string): void {
  if (!c.people.has(person)) c.say(at, line, `${what} is ${person}, who is not one of the people here.`);
}

/** An account and what of it is named: each must be there. Says nothing when it is all there. */
export function checkAccount(c: Ctx, at: string, line: string, account: string, what: string): boolean {
  if (c.account(account) !== undefined) return true;
  c.say(at, line, `${what} names the account ${account}, which is not connected.`);
  return false;
}
