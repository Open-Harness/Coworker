import { verify } from "@octokit/webhooks-methods";
import type { Routed, Trigger } from "~/modules/triggers/types.ts";
import type { Delivery, GitHubDependencies, GitHubEvent, Hub, Received } from "../types.ts";
import { isEvent, READERS, type Said } from "./events.ts";
import { type Json, numberAt, parse, recordAt, type Sender, senderOf, textAt } from "./payload.ts";

/** GitHub's own check, in constant time. A missing or malformed signature is a wrong one. */
async function signed(secret: string, delivery: Delivery): Promise<boolean> {
  if (delivery.signature === undefined || secret === "") return false;
  return verify(secret, delivery.body, delivery.signature).catch(() => false);
}

/** A name that is not known (an App with no slug set) is mentioned by no one. */
const mentions = (text: string, name: string): boolean =>
  name !== "" && new RegExp(`(^|[^\\w@])@${name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?![\\w-])`, "iu").test(text);

interface Context {
  readonly delivery: Delivery;
  readonly event: GitHubEvent;
  readonly installation: number;
  readonly repo: string;
  readonly sender: Sender;
  readonly said: Said;
  readonly at: number;
}

function triggerFor({ delivery, event, installation, repo, sender, said, at }: Context, managerId: string, addressed: boolean): Trigger {
  return {
    id: `github:${delivery.id}:${managerId}`,
    source: "github",
    managerId,
    scope: `repo:${repo}:${event}`,
    threads: said.numbers.map((number) => ({ kind: "github", key: `${repo}#${number}` })),
    actor: { kind: "github", id: sender.id, human: sender.human, display: sender.login, verified: true },
    ...(addressed ? { addressed: "mention" as const } : {}),
    at,
    title: said.title,
    text: said.text,
    attachments: [],
    replyTo: { kind: "github", installation, repo, number: said.number, fork: said.fork },
    ...(said.task === undefined ? {} : { task: said.task }),
  };
}

const line = (context: Context, reason: string): string =>
  `github from ${context.sender.login}: “${context.said.title}” → ignored: ${reason}`;

/** Hands the event to every manager listening to the repo, or says in its Events why not. */
async function route(hub: Hub, context: Context, appSlug: string): Promise<readonly Routed[]> {
  const listening = (await hub.gitHub()).sources.filter(({ repo }) => repo.toLowerCase() === context.repo.toLowerCase());
  const slugs = new Map((await hub.managers()).map(({ managerId, slug }) => [managerId, slug]));
  const own = !context.sender.human && context.sender.login.toLowerCase() === `${appSlug}[bot]`.toLowerCase();
  const routed: Routed[] = [];
  for (const source of listening) {
    const why = own
      ? "our own comment"
      : source.events.includes(context.event)
        ? undefined
        : `${context.event} is not chosen for ${source.repo}`;
    if (why !== undefined) {
      await hub.logEvent(source.managerId, line(context, why));
      routed.push({ _tag: "Dropped", reason: why });
      continue;
    }
    const words = `${context.said.title}\n${context.said.text}`;
    const addressed = mentions(words, appSlug) || mentions(words, slugs.get(source.managerId) ?? "\u0000");
    routed.push(await hub.receive(triggerFor(context, source.managerId, addressed)));
  }
  return routed;
}

function contextOf(delivery: Delivery, payload: Json, at: number): Context | { readonly reason: string } {
  if (!isEvent(delivery.event)) return { reason: `${delivery.event} is not an event managers hear` };
  const installation = numberAt(recordAt(payload, "installation"), "id");
  const repo = textAt(recordAt(payload, "repository"), "full_name");
  const sender = senderOf(payload);
  if (installation === undefined || repo === undefined || sender === undefined) return { reason: "no installation, repo or sender" };
  const read = READERS[delivery.event](payload, textAt(payload, "action") ?? "");
  if (read._tag === "Skipped") return { reason: read.reason };
  return { delivery, event: delivery.event, installation, repo, sender, said: read.said, at };
}

export async function receive(dependencies: GitHubDependencies, delivery: Delivery): Promise<Received> {
  if (!(await signed(dependencies.secret, delivery))) return { _tag: "Unsigned" };
  if (delivery.id === "") return { _tag: "Skipped", reason: "no delivery id" };
  const payload = parse(delivery.body);
  if (payload === undefined) return { _tag: "Skipped", reason: "the body is not JSON" };
  const installation = numberAt(recordAt(payload, "installation"), "id");
  if (delivery.event === "installation" && textAt(payload, "action") === "deleted" && installation !== undefined) {
    await dependencies.installations.removed(installation);
    return { _tag: "Uninstalled" };
  }
  const context = contextOf(delivery, payload, dependencies.now());
  if ("reason" in context) return { _tag: "Skipped", reason: context.reason };
  const hub = await dependencies.installations.hubOf(context.installation);
  if (hub === undefined) return { _tag: "Skipped", reason: "no workspace has this installation" };
  return { _tag: "Heard", routed: await route(hub, context, dependencies.appSlug) };
}
