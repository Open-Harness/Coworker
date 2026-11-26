import type { ModelPrice } from "../types.ts";

/** The result of one test call against a provider. */
export type Probe =
  | { readonly _tag: "Works"; readonly models: readonly string[]; readonly prices: Readonly<Record<string, ModelPrice>> }
  | { readonly _tag: "Failed"; readonly error: string };

/** OpenAI-style servers refuse a limit under 16 output tokens, so their test call asks for the least they accept. */
const LEAST_OPENAI_TOKENS = 16;
/** A list may hold models that cannot chat, or that a key may not use: the test call tries this many before it calls the provider failed. */
const TRIES = 4;

const PING = [{ role: "user", content: "Reply with one word." }];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** The provider's own words for what went wrong, as the Keys screen shows them. */
async function providerError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  const error = isRecord(body) ? body["error"] : undefined;
  if (isRecord(error) && typeof error["message"] === "string") return error["message"];
  if (typeof error === "string") return error;
  return `The provider answered ${response.status} ${response.statusText}`.trim();
}

/** The models a provider lists, and what a list that says its prices (dollars per token, as text) says they cost per million. */
async function listing(
  response: Response,
): Promise<{ readonly models: readonly string[]; readonly prices: Readonly<Record<string, ModelPrice>> }> {
  const body: unknown = await response.json().catch(() => undefined);
  const data = isRecord(body) && Array.isArray(body["data"]) ? body["data"] : [];
  const models = data.flatMap((model: unknown) => (isRecord(model) && typeof model["id"] === "string" ? [model["id"]] : []));
  const prices = Object.fromEntries(data.flatMap((model: unknown) => (isRecord(model) ? priced(model) : [])));
  return { models, prices };
}

const perMillion = (value: unknown): number | undefined => {
  const dollars = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 1e12) / 1e6 : undefined;
};

function priced(model: Readonly<Record<string, unknown>>): readonly (readonly [string, ModelPrice])[] {
  const { id, pricing } = model;
  if (typeof id !== "string" || !isRecord(pricing)) return [];
  const [input, output] = [perMillion(pricing["prompt"]), perMillion(pricing["completion"])];
  if (input === undefined || output === undefined) return [];
  const cached = perMillion(pricing["input_cache_read"]);
  return [[id, { input, output, ...(cached === undefined ? {} : { cached }) }]];
}

/** Lists the models, then asks the smallest one for a single token; if it cannot answer, the next, up to TRIES. */
async function probe(
  list: () => Promise<Response>,
  call: (model: string) => Promise<Response>,
  order: (models: readonly string[]) => readonly string[],
): Promise<Probe> {
  try {
    const listed = await list();
    if (!listed.ok) return { _tag: "Failed", error: await providerError(listed) };
    const { models, prices } = await listing(listed);
    const asked = order(models).slice(0, TRIES);
    if (asked.length === 0) return { _tag: "Failed", error: "The provider lists no models" };
    let first: string | undefined;
    for (const model of asked) {
      const answered = await call(model);
      if (answered.ok) return { _tag: "Works", models, prices };
      first ??= await providerError(answered);
    }
    return { _tag: "Failed", error: first ?? "The provider did not answer" };
  } catch (error) {
    return { _tag: "Failed", error: error instanceof Error ? error.message : String(error) };
  }
}

/** Models that do not chat: asked last. */
const NOT_CHAT = /embed|whisper|tts|image|audio|moderation|realtime|transcribe|search|dall-e/u;

/** The models containing the word first, then those that chat, then the rest. */
const preferring = (word: string) => (models: readonly string[]) => [
  ...models.filter((model) => model.includes(word)),
  ...models.filter((model) => !model.includes(word) && !NOT_CHAT.test(model)),
  ...models.filter((model) => !model.includes(word) && NOT_CHAT.test(model)),
];

export function probeAnthropic(send: typeof fetch, baseUrl: string, key: string): Promise<Probe> {
  const headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  return probe(
    () => send(`${baseUrl}/v1/models`, { headers }),
    (model) => send(`${baseUrl}/v1/messages`, { method: "POST", headers, body: JSON.stringify({ model, max_tokens: 1, messages: PING }) }),
    preferring("haiku"),
  );
}

export function probeOpenAICompatible(send: typeof fetch, baseUrl: string, key: string | undefined): Promise<Probe> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(key === undefined ? {} : { authorization: `Bearer ${key}` }),
  };
  return probe(
    () => send(`${baseUrl}/models`, { headers }),
    (model) =>
      send(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, max_tokens: LEAST_OPENAI_TOKENS, messages: PING }),
      }),
    preferring("mini"),
  );
}
