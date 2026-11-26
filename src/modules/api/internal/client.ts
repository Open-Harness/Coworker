import type { Answer, Api, Reads, Writes } from "../types.ts";

type Parts = Readonly<Record<string, string>>;
type Status = 401 | 403 | 404 | 409 | 422 | 429 | 500;
const STATUSES: readonly number[] = [401, 403, 404, 409, 422, 429, 500];
const isStatus = (status: number): status is Status => STATUSES.includes(status);

/** `/m/:manager/board?from` with its parts in: `:x` from the parts, and only the query names that were given. */
export function filled(path: string, parts: Parts = {}): string {
  const [route = "", query = ""] = path.split("?");
  const asked = query
    .split("&")
    .filter((name) => name !== "" && parts[name] !== undefined)
    .map((name) => `${name}=${encodeURIComponent(parts[name] ?? "")}`);
  const at = route.replaceAll(/:(\w+)/gu, (_, name: string) => encodeURIComponent(parts[name] ?? ""));
  return asked.length === 0 ? at : `${at}?${asked.join("&")}`;
}

/** An error answer says why in `{error}`; anything else is said by its status. */
async function problem(response: Response): Promise<Answer<never>> {
  const body: unknown = await response.json().catch(() => null);
  const says =
    typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : response.statusText;
  return { _tag: "Problem", status: isStatus(response.status) ? response.status : 500, says };
}

/** What a request that never got an answer is: the network, not the server. */
const unreachable: Answer<never> = { _tag: "Problem", status: 500, says: "It did not answer" };

async function answer<T>(request: Promise<Response>): Promise<Answer<T>> {
  const response = await request.catch(() => undefined);
  if (response === undefined) return unreachable;
  if (!response.ok) return problem(response);
  // The one place the page trusts what came: the console's own map of types (`types.ts`) says what each path gives.
  const value = (await response.json().catch(() => undefined)) as T | undefined;
  return value === undefined ? unreachable : { _tag: "Ok", value };
}

/** Whole paths outside a workspace (`/api/me`): the caller narrows what came. */
export const createOutside = (send: typeof fetch) => ({
  get: (path: string): Promise<Answer<unknown>> => answer(send(path, { headers: { accept: "application/json" } })),
  post: (path: string, body: unknown): Promise<Answer<unknown>> =>
    answer(send(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })),
});

export function createClient(send: typeof fetch, workspace: string): Api {
  const url = (id: string, path: keyof Reads | keyof Writes, parts?: Parts): string =>
    `/api/ws/${encodeURIComponent(id)}${filled(path, parts)}`;
  return {
    url,
    read: (path, parts) => answer(send(url(workspace, path, parts), { headers: { accept: "application/json" } })),
    write: (path, body, parts) =>
      answer(
        send(url(workspace, path, parts), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
      ),
  };
}
