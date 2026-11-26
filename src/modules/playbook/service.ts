import type { Playbooks } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const playbooks: Playbooks = {
  read: () => notBuilt("playbook.read"),
  write: () => notBuilt("playbook.write"),
  check: () => notBuilt("playbook.check"),
  lines: () => notBuilt("playbook.lines"),
  diff: () => notBuilt("playbook.diff"),
  apply: () => notBuilt("playbook.apply"),
  merge: () => notBuilt("playbook.merge"),
};
