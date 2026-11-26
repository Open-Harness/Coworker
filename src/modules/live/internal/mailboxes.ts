import type { Found, Step } from "../types.ts";
import { MAILBOX, WORKER, managerOn } from "./found.ts";

const CONFIG = "wrangler.mailbox.jsonc";
/** The mailbox module's addresses (`addressesOn`); a test checks that they are the same. */
const PEOPLE = ["person", "stranger"] as const;

const wrangler = (...args: string[]): readonly string[] => ["pnpm", "exec", "wrangler", ...args];

/**
 * Deploys the two people's mailboxes and sends their mail there, and the test manager's to staging. Each address has a
 * rule of its own: wrangler cannot point the catch-all at a Worker.
 */
export function mailboxSteps(found: Found, domain: string): readonly Step[] {
  const rule = (name: string, address: string, worker: string): Step => ({
    kind: "command",
    phase: "deploy",
    title: `Send ${address}'s mail to ${worker}`,
    argv: wrangler(
      "email",
      "routing",
      "rules",
      "create",
      domain,
      "--name",
      name,
      "--enabled",
      "--match-type",
      "literal",
      "--match-field",
      "to",
      "--match-value",
      address,
      "--action-type",
      "worker",
      "--action-value",
      worker,
    ),
  });
  return [
    { kind: "command", phase: "deploy", title: `Deploy ${MAILBOX}`, argv: wrangler("deploy", "--config", CONFIG) },
    {
      kind: "command",
      phase: "deploy",
      title: `Set the token of ${MAILBOX}`,
      argv: wrangler("secret", "put", "MAILBOX_TOKEN", "--config", CONFIG),
      stdin: ["LIVE_MAILBOX_TOKEN"],
    },
    ...PEOPLE.flatMap((name) => {
      const address = `${name}@${domain}`;
      return found.mailboxes?.includes(address.toLowerCase()) === true ? [] : [rule(name, address, MAILBOX)];
    }),
    ...(found.manager === true ? [] : [rule("launch.live", managerOn(domain), WORKER)]),
  ];
}
