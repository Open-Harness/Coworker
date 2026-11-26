import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What a mail needs from the outside: where the mail domain is, how big a mail may be, whose word on a sender counts, and where a workspace's object is. */
export interface MailIn {
  readonly mailDomain: string;
  readonly maxBytes: number;
  readonly authServId: string;
  readonly workspace: (address: string) => Promise<WorkspaceApi | undefined>;
  readonly now: () => number;
}

/** What Email Routing hands the Worker. */
export interface Incoming {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array> | Uint8Array | string;
  readonly rawSize: number;
}

export type MailReceived =
  /** Refused at the door: Email Routing bounces it to the sender with this reason. */
  { readonly _tag: "Rejected"; readonly reason: string } | { readonly _tag: "Heard"; readonly heard: string };

const NO_SUCH_ADDRESS = "There is no such address here";

/** The workspace an address names: `<workspace>@<mail domain>`, and `+anything` after the name is the same address. */
function workspaceOf(to: string, mailDomain: string): string | undefined {
  const found = /^([a-z0-9][a-z0-9._-]*?)(?:\+[^@\s]*)?@([^@\s]+)$/iu.exec(to.trim());
  return found?.[2]?.toLowerCase() === mailDomain.toLowerCase() ? found[1]?.toLowerCase() : undefined;
}

/** Mail to a workspace's address: kept in that workspace's mailbox, and judged there. What cannot be kept is rejected, with the reason. */
export async function mailIn(deps: MailIn, incoming: Incoming): Promise<MailReceived> {
  if (incoming.rawSize > deps.maxBytes)
    return {
      _tag: "Rejected",
      reason: `The message is over ${Math.round(deps.maxBytes / 1_048_576)} MB. Send a link to large files instead.`,
    };
  const address = workspaceOf(incoming.to, deps.mailDomain);
  const object = address === undefined ? undefined : await deps.workspace(address);
  if (object === undefined) return { _tag: "Rejected", reason: NO_SUCH_ADDRESS };
  const raw = incoming.raw instanceof ReadableStream ? new Uint8Array(await new Response(incoming.raw).arrayBuffer()) : incoming.raw;
  const answer = await object.consoleStore({
    op: "mail",
    call: { is: "hear", raw, from: incoming.from, to: incoming.to, at: deps.now(), server: deps.authServId },
  });
  if (!("op" in answer) || answer.op !== "mail" || answer.answer.is !== "heard") return { _tag: "Rejected", reason: NO_SUCH_ADDRESS };
  return { _tag: "Heard", heard: answer.answer.heard };
}
