import type { ModelPrice } from "../types.ts";

/** The result of one test call against a provider. */
export type Probe =
  | { readonly _tag: "Works"; readonly models: readonly string[]; readonly prices: Readonly<Record<string, ModelPrice>> }
  | { readonly _tag: "Failed"; readonly error: string };

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

/** Lists the models, then asks the smallest one for a single token. */
async function probe(
  list: () => Promise<Response>,
  call: (model: string) => Promise<Response>,
  smallest: (models: readonly string[]) => string | undefined,
): Promise<Probe> {
  try {
    const listed = await list();
    if (!listed.ok) return { _tag: "Failed", error: await providerError(listed) };
    const { models, prices } = await listing(listed);
    const model = smallest(models);
    if (model === undefined) return { _tag: "Failed", error: "The provider lists no models" };
    const answered = await call(model);
    return answered.ok ? { _tag: "Works", models, prices } : { _tag: "Failed", error: await providerError(answered) };
  } catch (error) {
    return { _tag: "Failed", error: error instanceof Error ? error.message : String(error) };
  }
}

const preferring = (word: string) => (models: readonly string[]) => models.find((model) => model.includes(word)) ?? models[0];

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
      send(`${baseUrl}/chat/completions`, { method: "POST", headers, body: JSON.stringify({ model, max_tokens: 1, messages: PING }) }),
    preferring("mini"),
  );
}
