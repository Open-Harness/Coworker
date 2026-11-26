import type { BoxHandle, BoxHost, GitPort, Opened, Ran } from "./types.ts";

/**
 * Containers and the push, over HTTP, in the evals' world (`evals/world/boxes.ts`): real commands in a real clone,
 * offline. The composition root uses these when `DT_OUTSIDE` is `http`. Paths and commands are relative to the clone.
 */
export const BOXES_AT = "https://boxes.flows.test";

type Send = (path: string, body: unknown, token?: string) => Promise<Response>;

const sender =
  (send: typeof fetch, at: string): Send =>
  (path, body, token) =>
    send(`${at}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    });

function handle(send: Send, work: string): BoxHandle {
  const call = async <T>(path: string, body: object): Promise<T> => {
    const response = await send(path, { work, ...body });
    if (!response.ok) throw new Error(`The box is gone: ${response.status}`);
    return (await response.json()) as T;
  };
  return {
    exec: (command, options) => call<Ran>("/exec", { command, ...options }),
    read: async (path) => (await call<{ text: string | null }>("/read", { path })).text ?? undefined,
    write: async (path, text) => void (await call("/write", { path, text })),
  };
}

export function httpBoxes(fetcher: typeof fetch, at: string = BOXES_AT): BoxHost {
  const send = sender(fetcher, at);
  return {
    start: async (spec, from) => {
      const answer = (await (await send("/start", { ...spec, from })).json()) as
        | { _tag: "Open"; from: "new" | "saved" }
        | Extract<Opened, { _tag: "Unavailable" }>;
      return answer._tag === "Open" ? { ...answer, box: handle(send, spec.work) } : answer;
    },
    find: async (work) => {
      const { there } = (await (await send("/find", { work })).json()) as { there: boolean };
      return there ? handle(send, work) : undefined;
    },
    save: async (work) => {
      const response = await send("/save", { work });
      return response.ok ? ((await response.json()) as { snapshot: string }) : undefined;
    },
    destroy: async (work) => void (await send("/destroy", { work })),
  };
}

const base64 = (bytes: Uint8Array): string => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

export function httpGit(fetcher: typeof fetch, at: string = BOXES_AT): GitPort {
  const send = sender(fetcher, at);
  return {
    push: async ({ bytes, ...bundle }, token, options) =>
      (await (await send("/push", { ...bundle, bytes: base64(bytes), ...options }, token)).json()) as Awaited<ReturnType<GitPort["push"]>>,
  };
}
