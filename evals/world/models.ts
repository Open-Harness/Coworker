import { bodyOf, isRecord, json, list, text, type Json } from "./http.ts";

/*
 * `https://models.flows.test/v1`: an OpenAI-compatible server whose models do what a flow wrote down. Each model id is one
 * flow's own. A rule fires when everything it asks for is true of the request; rules are tried in order, each fires
 * `times` times (once unless said), and a request no rule wants ends the turn with "I have nothing to do."
 */

export interface Rule {
  /** This tool is offered. */
  readonly tool?: string;
  /** Found in what it is told (any message). Its groups are `$1`, `$2` in `do`. */
  readonly sees?: string;
  /** The last message is what this tool answered. */
  readonly after?: string;
  /** Nothing has been answered yet: the turn starts. */
  readonly start?: true;
  readonly times?: number | "always";
  readonly do: Did | { readonly judge: Judging };
}

/** What a model does in the end. */
export type Did = { readonly call: string; readonly args: Json } | { readonly say: string } | { readonly fail: number };

/**
 * The judge's answer, made from what it is told. Its prompt has one line for each kind of each manager that hears the item,
 * `kind <manager>/<kind>: <when>`, before the line `--- outside words (untrusted) ---` (intake README). Every kind asked is
 * answered: yes for those in `yes`, no for the rest.
 */
export interface Judging {
  readonly yes: readonly { readonly manager: string; readonly kind: string; readonly fit?: number; readonly why?: string }[];
  /** Why not, for each of the others. */
  readonly no?: string;
  readonly joins?: string;
}

export interface Seen {
  readonly model: string;
  /** Every message, as text, joined: what the model was told. */
  readonly told: string;
  readonly tools: readonly string[];
  readonly thinking: string | null;
  readonly credential: "right" | "wrong" | "none";
  readonly did: string;
}

/** Dollars a request costs, said in the list of models the way OpenRouter says it. None: the price is not known. */
export type PerToken = { readonly prompt: string; readonly completion: string };

const rules = new Map<string, { rule: Rule; left: number }[]>();
const prices = new Map<string, PerToken>();
/** The last answer of each model, with what it was asked: asked the same again (a replay after a crash), it answers the same. */
const answers = new Map<string, { readonly key: string; readonly does: Exclude<Did, { fail: number }> }>();
/** Models that are switched off: every request to one fails. */
const off = new Set<string>();
export const seen: Seen[] = [];
export const KEY = "flows-key-that-works";

export function script(model: string, wanted: readonly Rule[], price: PerToken | undefined): void {
  if (price !== undefined) prices.set(model, price);
  answers.delete(model);
  rules.set(
    model,
    wanted.map((rule) => ({ rule, left: rule.times === "always" ? Number.POSITIVE_INFINITY : (rule.times ?? 1) })),
  );
}
export const turn = (model: string, is: "on" | "off"): void => void (is === "off" ? off.add(model) : off.delete(model));

const contentOf = (message: unknown): string => {
  if (!isRecord(message)) return "";
  const { content } = message;
  const said = typeof content === "string" ? content : list(content).map((part) => (isRecord(part) ? text(part["text"]) : "")).join("\n");
  // What it called, with the arguments, is part of what it has said.
  const called = list(message["tool_calls"]).map((call) => (isRecord(call) && isRecord(call["function"]) ? text(call["function"]["arguments"]) : ""));
  return [said, ...called].filter((part) => part !== "").join("\n");
};

const namesOf = (tools: unknown): readonly string[] =>
  list(tools).flatMap((tool) => (isRecord(tool) && isRecord(tool["function"]) ? [text(tool["function"]["name"])] : []));

/** The name of the tool the last message answers, if it is an answer. */
function answered(messages: readonly unknown[]): string | undefined {
  const last = messages.at(-1);
  if (!isRecord(last) || last["role"] !== "tool") return undefined;
  for (const message of [...messages].reverse())
    for (const call of list(isRecord(message) ? message["tool_calls"] : undefined))
      if (isRecord(call) && call["id"] === last["tool_call_id"] && isRecord(call["function"])) return text(call["function"]["name"]);
  return "";
}

function fill(value: unknown, groups: readonly string[]): unknown {
  if (typeof value === "string") return value.replaceAll(/\$(\d)/gu, (whole, n: string) => groups[Number(n)] ?? whole);
  if (Array.isArray(value)) return value.map((one) => fill(one, groups));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, one]) => [key, fill(one, groups)]));
  return value;
}

/** The kinds a judge is asked about, in the order asked: before the mark that begins the outside words. */
function kindsAsked(told: string): readonly { manager: string; kind: string }[] {
  const mark = told.indexOf("--- outside words (untrusted) ---");
  const asked = mark < 0 ? told : told.slice(0, mark);
  return [...asked.matchAll(/^kind ([^\s/]+)\/([^\s:]+): /gmu)].map(([, manager = "", kind = ""]) => ({ manager, kind }));
}

function judged(told: string, judging: Judging): Did {
  const said = (one: { manager: string; kind: string }) => judging.yes.find(({ manager, kind }) => manager === one.manager && kind === one.kind);
  const all = kindsAsked(told).map((one) => ({ manager: one.manager, kind: one.kind, is: said(one) !== undefined, why: said(one)?.why ?? judging.no ?? "It is not that", fit: said(one) === undefined ? 0.1 : (said(one)?.fit ?? 0.9) }));
  const verdicts = [...all.filter(({ is }) => is), ...all.filter(({ is }) => !is)];
  return { call: "judge", args: { verdicts, ...(judging.joins === undefined ? {} : { joins: judging.joins }) } };
}

function pick(model: string, told: string, tools: readonly string[], after: string | undefined): Did {
  for (const held of rules.get(model) ?? []) {
    const { rule } = held;
    const match = rule.sees === undefined ? [""] : new RegExp(rule.sees, "su").exec(told);
    if (held.left <= 0 || match === null) continue;
    if (rule.tool !== undefined && !tools.includes(rule.tool)) continue;
    if (rule.after !== undefined && after !== rule.after) continue;
    if (rule.start === true && after !== undefined) continue;
    held.left -= 1;
    const filled = fill(rule.do, [...match]) as Rule["do"];
    return "judge" in filled ? judged(told, filled.judge) : filled;
  }
  return { say: "I have nothing to do." };
}

let made = 0;
const event = (value: unknown): string => `data: ${JSON.stringify(value)}\n\n`;

function streamed(model: string, does: Exclude<Did, { fail: number }>): Response {
  made += 1;
  const id = `cmpl_${made}`;
  const chunk = (delta: Json, finish: string | null) =>
    event({ id, object: "chat.completion.chunk", created: 0, model, choices: [{ index: 0, delta, finish_reason: finish }] });
  const usage = { id, object: "chat.completion.chunk", created: 0, model, choices: [], usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 } };
  const parts =
    "say" in does
      ? [chunk({ role: "assistant", content: does.say }, null), chunk({}, "stop")]
      : [
          chunk({ role: "assistant", content: null, tool_calls: [{ index: 0, id: `call_${made}`, type: "function", function: { name: does.call, arguments: JSON.stringify(does.args) } }] }, null),
          chunk({}, "tool_calls"),
        ];
  return new Response([...parts, event(usage), "data: [DONE]\n\n"].join(""), { headers: { "content-type": "text/event-stream" } });
}

export async function models(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  if (host !== "models.flows.test") return undefined;
  const sent = request.headers.get("authorization");
  const credential = sent === null ? "none" : sent === `Bearer ${KEY}` ? "right" : "wrong";
  if (credential !== "right") return json({ error: { message: "Incorrect API key provided.", code: "invalid_api_key" } }, 401);
  if (pathname === "/v1/models") return json({ object: "list", data: [...rules.keys()].map((id) => ({ id, object: "model", pricing: prices.get(id) })) });
  if (pathname !== "/v1/chat/completions") return json({ error: { message: "Not found" } }, 404);
  const body = await bodyOf(request);
  const [model, messages, tools] = [text(body["model"]), list(body["messages"]), namesOf(body["tools"])];
  if (body["stream"] !== true) return json({ id: "probe", choices: [{ message: { role: "assistant", content: "Ok" } }] });
  if (off.has(model)) return json({ error: { message: "This model is not available", code: "model_unavailable" } }, 503);
  if (!rules.has(model)) return json({ error: { message: `The model ${model} does not exist`, code: "model_not_found" } }, 404);
  const told = messages.map(contentOf).join("\n\n");
  const key = JSON.stringify([messages, tools]);
  const before = answers.get(model);
  const does = before?.key === key ? before.does : pick(model, told, tools, answered(messages));
  if (!("fail" in does)) answers.set(model, { key, does });
  const thinking = text(body["reasoning_effort"]) || null;
  const did = "call" in does ? `${does.call} ${JSON.stringify(does.args)}` : "say" in does ? does.say : `fail ${does.fail}`;
  seen.push({ model, told, tools, thinking, credential, did });
  return "fail" in does ? json({ error: { message: "The server had an error" } }, does.fail) : streamed(model, does);
}
