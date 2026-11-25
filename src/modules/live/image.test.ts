import { describe, expect, it } from "vitest";
import config from "~/../wrangler.jsonc?raw";
import { live } from "./service.ts";
import type { RegistryFetch } from "./types.ts";

const MB = 1024 * 1024;
const TARGET = "https://registry.cloudflare.com/v2/acct/coworker-sandbox";
const hash = (letter: string): string => `sha256:${letter.repeat(64)}`;
const layers = [
  { digest: hash("a"), size: 12 * MB },
  { digest: hash("b"), size: 3 },
];
const manifest = JSON.stringify({ config: { digest: hash("c"), size: 2 }, layers });

/** Both registries: Docker Hub with one image, and Cloudflare's with the blobs it was given. */
function registries(there: readonly string[] = []) {
  const blobs = new Map<string, number>(there.map((digest) => [digest, 0]));
  const sizes = new Map([...layers.map(({ digest, size }) => [digest, size] as const), [hash("c"), 2] as const]);
  const parts: string[] = [];
  let pushed = "";
  let sending = 0;
  const own = (path: string, init: RequestInit): Response => {
    const headers = new Headers(init.headers);
    if (headers.get("authorization") !== `Basic ${btoa("v1:secret")}`) return new Response(null, { status: 401 });
    const blob = /\/blobs\/(sha256:\w+)$/u.exec(path)?.[1];
    if (init.method === "HEAD") return new Response(null, { status: blob !== undefined && blobs.has(blob) ? 200 : 404 });
    if (init.method === "POST") {
      sending = 0;
      return new Response(null, { status: 202, headers: { location: "/v2/acct/coworker-sandbox/blobs/uploads/u1?_state=0" } });
    }
    if (init.method === "PATCH") {
      parts.push(headers.get("content-range") ?? "");
      sending += (init.body as Uint8Array).length;
      return new Response(null, { status: 202, headers: { location: `/v2/acct/coworker-sandbox/blobs/uploads/u1?_state=${sending}` } });
    }
    const digest = new URL(`https://x${path}`).searchParams.get("digest");
    if (digest === null) pushed = String(init.body);
    else if (!path.includes(`_state=${sending}`)) return new Response(null, { status: 416 });
    else blobs.set(digest, sending);
    return new Response(null, { status: 201 });
  };
  const fetch: RegistryFetch = (url, init) => {
    const { host, pathname, search } = new URL(url);
    if (host === "registry.cloudflare.com") return Promise.resolve(own(`${pathname}${search}`, init));
    if (host === "auth.docker.io") return Promise.resolve(Response.json({ token: "t" }));
    if (pathname.includes("/manifests/"))
      return Promise.resolve(pathname.endsWith(hash("f")) ? new Response(manifest) : new Response(null, { status: 404 }));
    return Promise.resolve(new Response(new Uint8Array(sizes.get(pathname.split("/").at(-1) ?? "") ?? 0)));
  };
  return { fetch, blobs, parts, pushed: () => pushed };
}

const copy = (fetch: RegistryFetch, digest = hash("f"), password = "secret") =>
  live.copyImage({
    fetch,
    source: "library/node",
    target: TARGET,
    digest,
    credentials: { username: "v1", password },
    said: () => undefined,
  });

describe("the sandbox image", () => {
  it("is named by its digest in Cloudflare's registry", () => {
    expect(live.imageIn(config)).toMatchObject({
      host: "registry.cloudflare.com",
      digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
    });
    expect(live.imageIn('"image": "docker.io/library/node:24"')).toBeUndefined();
  });

  it("is copied whole, in parts of one size, and its manifest last, byte for byte", async () => {
    const { fetch, blobs, parts, pushed } = registries();
    expect(await copy(fetch)).toEqual({ _tag: "Copied", blobs: 3 });
    expect([...blobs]).toEqual([...layers.map(({ digest, size }) => [digest, size]), [hash("c"), 2]]);
    expect(parts.slice(0, 3)).toEqual([`0-${5 * MB - 1}`, `${5 * MB}-${10 * MB - 1}`, `${10 * MB}-${12 * MB - 1}`]);
    expect(pushed()).toBe(manifest);
  });

  it("sends only what is missing", async () => {
    expect(await copy(registries([hash("a"), hash("b")]).fetch)).toEqual({ _tag: "Copied", blobs: 1 });
  });

  it("sends again what the line dropped, and says so when it stays down", async () => {
    const { fetch, blobs } = registries();
    let dropped = 0;
    const flaky: RegistryFetch = (url, init) => (dropped++ % 3 === 0 ? Promise.reject(new TypeError("fetch failed")) : fetch(url, init));
    expect(await copy(flaky)).toEqual({ _tag: "Copied", blobs: 3 });
    expect(blobs.get(hash("a"))).toBe(12 * MB);
    const down: RegistryFetch = () => Promise.reject(new TypeError("fetch failed"));
    expect(await copy(down)).toEqual({ _tag: "Failed", reason: "Docker Hub answered 599" });
  });

  it("says which registry refused", async () => {
    expect(await copy(registries().fetch, hash("e"))).toEqual({ _tag: "Failed", reason: "Docker Hub answered 404" });
    expect(await copy(registries().fetch, hash("f"), "wrong")).toEqual({ _tag: "Failed", reason: "Cloudflare's registry answered 401" });
  });
});
