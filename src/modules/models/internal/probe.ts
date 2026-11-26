/** The result of one test call against a provider. */
export type Probe = { readonly _tag: "Works"; readonly models: readonly string[] } | { readonly _tag: "Failed"; readonly error: string };

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

async function modelIds(response: Response): Promise<readonly string[]> {
  const body: unknown = await response.json().catch(() => undefined);
  const data = isRecord(body) && Array.isArray(body["data"]) ? body["data"] : [];
  return data.flatMap((model: unknown) => (isRecord(model) && typeof model["id"] === "string" ? [model["id"]] : []));
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
    const models = await modelIds(listed);
    const model = smallest(models);
    if (model === undefined) return { _tag: "Failed", error: "The provider lists no models" };
    const answered = await call(model);
    return answered.ok ? { _tag: "Works", models } : { _tag: "Failed", error: await providerError(answered) };
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
