import { exports } from "cloudflare:workers";
import { eml } from "~/modules/email/testing.ts";
import type { EventEntry } from "~/modules/workspace/types.ts";
import { json } from "./flows.ts";
import type { Team } from "./team.ts";

type Handler = { email(message: ForwardableEmailMessage): Promise<void> };
const worker = (exports as unknown as { default: Handler }).default;

/** What Email Routing did with a message: taken in, or bounced with a reason. */
export interface Delivered {
  readonly rejected: string | undefined;
}

/** Hands a message to the Worker's `email()` handler as Email Routing would. */
export async function mail(to: string, message: Parameters<typeof eml>[0] | string, rawSize?: number): Promise<Delivered> {
  const raw = typeof message === "string" ? message : eml(message);
  const bytes = new TextEncoder().encode(raw);
  let rejected: string | undefined;
  const from = typeof message === "string" ? "sender@example.test" : message.from;
  const forwardable = {
    from,
    to,
    headers: new Headers(),
    raw: new Response(bytes).body ?? new ReadableStream(),
    rawSize: rawSize ?? bytes.byteLength,
    setReject: (reason: string) => void (rejected = reason),
    forward: async () => ({ messageId: "" }),
    reply: async () => ({ messageId: "" }),
  } as unknown as ForwardableEmailMessage;
  await worker.email(forwardable);
  return { rejected };
}

/** Lets these addresses ask the team's manager, by email. */
export const allow = (launch: Team, ...addresses: string[]): Promise<Response> =>
  launch.owner.send("PUT", `${launch.base}/policy`, {
    acceptMode: "observe",
    allowed: addresses.map((id) => ({ kind: "handle", handle: { kind: "email", id } })),
  });

export const events = async (launch: Team): Promise<readonly EventEntry[]> =>
  (await json<{ events: readonly EventEntry[] }>(await launch.owner.send("GET", `${launch.base}/events`))).events;

/** The manager's own address and a Task's. */
export const addressOf = (launch: Team, task?: string): string =>
  task === undefined ? launch.manager.address : launch.manager.address.replace("@", `+${task.toLowerCase()}@`);
