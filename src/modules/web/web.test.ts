import { describe, expect, it } from "vitest";
import { ToolBench, type ToolOutcome } from "../../../test/engine.ts";
import { createWebFetchTool } from "./service.ts";
import type { WebDependencies } from "./types.ts";

const PUBLIC = "93.184.216.34";
type Pages = Readonly<Record<string, () => Response>>;

/** The internet, as far as a test goes: pages by URL, and addresses by host name. */
function internet(pages: Pages, hosts: Readonly<Record<string, string>> = {}): { fetch: WebDependencies["fetch"]; seen: string[] } {
  const seen: string[] = [];
  const fetch: WebDependencies["fetch"] = async (input) => {
    const url = new URL(input);
    if (url.hostname === "cloudflare-dns.com") {
      const address = hosts[url.searchParams.get("name") ?? ""] ?? PUBLIC;
      const isWanted = url.searchParams.get("type") === (address.includes(":") ? "AAAA" : "A");
      return Response.json({ Answer: isWanted ? [{ type: address.includes(":") ? 28 : 1, data: address }] : [] });
    }
    seen.push(input);
    return pages[url.href]?.() ?? new Response("missing", { status: 404 });
  };
  return { fetch, seen };
}

async function read(url: string, pages: Pages = {}, hosts: Record<string, string> = {}): Promise<ToolOutcome & { seen: string[] }> {
  const { fetch, seen } = internet(pages, hosts);
  const bench = await ToolBench.open([createWebFetchTool({ fetch })]);
  const outcome = await bench.call("web_fetch", { url });
  await bench.close();
  return { ...outcome, seen };
}
const html = (body: string) => () => new Response(body, { headers: { "Content-Type": "text/html" } });

describe("web_fetch", () => {
  it("reads a page as text with its title", async () => {
    const page = html('<title>A &amp; B</title><script>x()</script><h1>Hi</h1><ul><li><a href="https://b.test/">b</a></ul>');
    const { text, details } = await read("https://a.test/", { "https://a.test/": page });
    expect(details).toEqual({ url: "https://a.test/", status: 200, title: "A & B" });
    expect(text).toContain("# Hi");
    expect(text).toContain("- b (https://b.test/)");
    expect(text).not.toContain("x()");
  });

  it.each([
    ["this machine", "http://127.0.0.1/"],
    ["this machine, written oddly", "http://0x7f.1/"],
    ["this machine over IPv6", "http://[::1]/"],
    ["IPv4 inside IPv6", "http://[::ffff:10.0.0.1]/"],
    ["the tailnet", "http://100.100.100.100/"],
    ["the cloud's metadata", "http://169.254.169.254/latest"],
    ["a private network", "http://192.168.1.1/"],
    ["a tailnet name", "https://box.tail1234.ts.net/"],
    ["a bare name", "http://router/"],
    ["localhost", "http://localhost/"],
    ["another protocol", "file:///etc/passwd"],
    ["credentials", "https://me:pw@a.test/"],
    ["another port", "https://a.test:8317/"],
    ["nonsense", "not a url"],
  ])("refuses %s without asking anyone", async (_name, url) => {
    const { isError, seen } = await read(url);
    expect({ isError, seen }).toEqual({ isError: true, seen: [] });
  });

  it.each([
    ["the tailnet", "100.64.0.9"],
    ["this machine", "127.0.0.1"],
    ["a private network", "fd7a:115c:a1e0::1"],
  ])("refuses a public name that points at %s", async (_name, address) => {
    const { isError, seen } = await read("https://sneaky.test/", {}, { "sneaky.test": address });
    expect({ isError, seen }).toEqual({ isError: true, seen: [] });
  });

  it("checks every redirect", async () => {
    const to = (Location: string) => () => new Response(null, { status: 302, headers: { Location } });
    const moved = await read("https://a.test/", { "https://a.test/": to("/b"), "https://a.test/b": html("<p>here</p>") });
    expect(moved.text).toContain("here");
    const trapped = await read("https://a.test/", { "https://a.test/": to("http://127.0.0.1:8317/") });
    expect(trapped).toMatchObject({ isError: true, seen: ["https://a.test/"] });
    const endless = await read("https://a.test/", { "https://a.test/": to("https://a.test/") });
    expect(endless.isError).toBe(true);
  });

  it("refuses what is not text and cuts what is too long", async () => {
    const image = () => new Response(new Uint8Array(8), { headers: { "Content-Type": "image/png" } });
    expect((await read("https://a.test/", { "https://a.test/": image })).isError).toBe(true);
    const long = await read("https://a.test/", { "https://a.test/": html(`<p>${"a".repeat(3_000_000)}</p>`) });
    expect(long.isError).toBe(false);
    expect(long.text.length).toBeLessThan(40_000);
    expect(long.text).toContain('"truncated":true');
  });
});
