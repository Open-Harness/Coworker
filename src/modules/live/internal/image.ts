import type { CopyImage, Copied, RegistryFetch } from "../types.ts";

/**
 * Copies one image from Docker Hub into Cloudflare's registry over the registry HTTP API, so nobody needs Docker. Blobs
 * that are there already are left alone, so it can be run again. The digest names the bytes: what arrives is what was named.
 */
const HUB = "https://registry-1.docker.io/v2";
const MANIFEST = "application/vnd.oci.image.manifest.v1+json";
/** A part of an upload: the smallest the registry takes, so a slow line finishes one before the registry gives up on it. */
const PART = 5 * 1024 * 1024;
const TRIES = 4;

interface Descriptor {
  readonly digest: string;
  readonly size: number;
}

interface Manifest {
  readonly config: Descriptor;
  readonly layers: readonly Descriptor[];
}

/** `registry.cloudflare.com/<account>/<name>@sha256:<digest>`, as `wrangler.jsonc` names it. */
export function imageIn(config: string): { readonly host: string; readonly repository: string; readonly digest: string } | undefined {
  const found = /"(registry\.cloudflare\.com)\/([^"@]+)@(sha256:[0-9a-f]{64})"/u.exec(config);
  return found === null ? undefined : { host: found[1] ?? "", repository: found[2] ?? "", digest: found[3] ?? "" };
}

const failed = (what: string, response: Response): Copied => ({ _tag: "Failed", reason: `${what} answered ${response.status}` });

/** A request that is sent again when the line drops, which is a 599 when it stays down. */
async function send(fetch: RegistryFetch, url: string, init: RequestInit): Promise<Response> {
  for (let tried = 1; tried <= TRIES; tried += 1) {
    const answer = await fetch(url, init).catch(() => undefined);
    if (answer !== undefined && answer.status < 500) return answer;
  }
  return new Response(null, { status: 599, statusText: "no answer" });
}

async function hubToken(fetch: RegistryFetch, repository: string): Promise<string | undefined> {
  const response = await send(fetch, `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`, {});
  const { token } = (await response.json().catch(() => ({}))) as { token?: string };
  return token;
}

/** Sends one blob in parts. The registry names where each next part goes. */
async function upload(fetch: RegistryFetch, repository: string, digest: string, bytes: Uint8Array<ArrayBuffer>, authorization: string) {
  const started = await send(fetch, `${repository}/blobs/uploads/`, { method: "POST", headers: { authorization } });
  const next = (response: Response): string => new URL(response.headers.get("location") ?? "", repository).href;
  if (started.status !== 202) return started;
  let at = next(started);
  for (let from = 0; from < bytes.length; from += PART) {
    const part = bytes.subarray(from, from + PART);
    const headers = {
      authorization,
      "content-type": "application/octet-stream",
      "content-range": `${from}-${from + part.length - 1}`,
      "content-length": String(part.length),
    };
    const sent = await send(fetch, at, { method: "PATCH", headers, body: part });
    if (sent.status !== 202) return sent;
    at = next(sent);
  }
  const end = new URL(at);
  end.searchParams.set("digest", digest);
  return send(fetch, end.href, { method: "PUT", headers: { authorization, "content-length": "0" } });
}

export const copyImage: CopyImage = async ({ fetch, source, target, digest, credentials, said }) => {
  const authorization = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
  const there = await send(fetch, `${target}/manifests/${digest}`, { method: "HEAD", headers: { authorization, accept: MANIFEST } });
  if (there.status === 200) return { _tag: "Copied", blobs: 0 };
  const hub = async () => ({ authorization: `Bearer ${await hubToken(fetch, source)}`, accept: MANIFEST });
  const found = await send(fetch, `${HUB}/${source}/manifests/${digest}`, { headers: await hub() });
  if (found.status !== 200) return failed("Docker Hub", found);
  const text = await found.text();
  const { config, layers } = JSON.parse(text) as Manifest;
  let blobs = 0;
  for (const blob of [...layers, config]) {
    const kept = await send(fetch, `${target}/blobs/${blob.digest}`, { method: "HEAD", headers: { authorization } });
    if (kept.status === 200) continue;
    said(`${blob.digest.slice(7, 19)} (${Math.max(1, Math.round(blob.size / 1e6))} MB)`);
    // A token of Docker Hub's lasts five minutes, less than a big layer may take to send.
    const read = await send(fetch, `${HUB}/${source}/blobs/${blob.digest}`, { headers: await hub() });
    if (read.status !== 200) return failed("Docker Hub", read);
    const bytes = await read.arrayBuffer().catch(() => undefined);
    if (bytes === undefined) return { _tag: "Failed", reason: "Docker Hub stopped half way" };
    const sent = await upload(fetch, target, blob.digest, new Uint8Array(bytes), authorization);
    if (sent.status !== 201) return failed("Cloudflare's registry", sent);
    blobs += 1;
  }
  const put = await send(fetch, `${target}/manifests/${digest}`, {
    method: "PUT",
    headers: { authorization, "content-type": MANIFEST },
    body: text,
  });
  return put.status === 201 ? { _tag: "Copied", blobs } : failed("Cloudflare's registry", put);
};
