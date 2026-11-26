import type { FetchFunction } from "@earendil-works/pi-ai";
import type { ModelLink } from "../types.ts";

/** Where the provider's SDK believes it is calling. Nothing is ever sent there: the fetch below answers every call. */
export const GATEWAY_HOST = "models.workspace.invalid";

/** The headers a call may carry to the workspace, and no others. The SDK's own credential header is not among them. */
const CARRIED = ["accept", "anthropic-version", "anthropic-beta"];

const refused = (message: string): Response => Response.json({ type: "error", error: { type: "gateway_error", message } }, { status: 502 });

const aborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_, reject) => {
    const stop = (): void => reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
  });

/**
 * The fetch the model SDKs use: it turns their request into a `ModelCall` for the Workspace object and hands back the
 * streamed answer. Only the path, the body and the carried headers go, so the SDK's placeholder credential goes
 * nowhere, and a request to any other host is refused.
 */
export function gatewayFetch(link: ModelLink): FetchFunction {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.host !== GATEWAY_HOST) return refused(`The manager may only call its workspace's model, not ${url.host}`);
    const headers = Object.fromEntries(
      CARRIED.flatMap((name) => {
        const value = request.headers.get(name);
        return value === null ? [] : [[name, value]];
      }),
    );
    const answer = link.modelCall({ path: url.pathname, body: await request.text(), headers });
    return Promise.race([answer, aborted(request.signal)]);
  };
}
