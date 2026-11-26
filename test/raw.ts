import { exports } from "cloudflare:workers";
import { APP, type Browser } from "./flows.ts";

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

/** A request whose body is bytes, not JSON: a logo going up, a file coming down. */
export const sendRaw = (as: Browser, method: string, path: string, body?: Uint8Array, type?: string): Promise<Response> =>
  worker.fetch(
    new Request(`${APP}${path}`, {
      method,
      redirect: "manual",
      headers: { origin: APP, cookie: as.cookie, ...(type === undefined ? {} : { "content-type": type }) },
      ...(body === undefined ? {} : { body: body.slice() }),
    }),
  );

/** The smallest PNG there is: its signature and an empty header, enough for the server to know what it is. */
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
