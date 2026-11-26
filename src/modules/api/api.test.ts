import { describe, expect, it } from "vitest";
import { createApi } from "./service.ts";

const answering = (status: number, body: unknown) => {
  const asked: { url: string; init: RequestInit | undefined }[] = [];
  const send: typeof fetch = (input, init) => {
    asked.push({ url: String(input), init });
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  };
  return { api: createApi({ fetch: send, workspace: "acme" }), asked };
};

describe("api", () => {
  it("reads a path under the workspace, with its parts in and only the query it was given", async () => {
    const { api, asked } = answering(200, { found: [] });
    const got = await api.read("/m/:manager/intake?from&state&before", { manager: "sales", state: "open" });
    expect(got).toEqual({ _tag: "Ok", value: { found: [] } });
    expect(asked[0]?.url).toBe("/api/ws/acme/m/sales/intake?state=open");
  });

  it("says why when the server refuses, and what a missing page is", async () => {
    const gone = await answering(404, { error: "Not found" }).api.read("/m/:manager", { manager: "nobody" });
    expect(gone).toEqual({ _tag: "Problem", status: 404, says: "Not found" });
    const odd = await answering(502, "bad gateway").api.read("/shell");
    expect(odd).toMatchObject({ _tag: "Problem", status: 500 });
  });

  it("is a problem, not an exception, when nothing answers", async () => {
    const api = createApi({ fetch: () => Promise.reject(new Error("offline")), workspace: "acme" });
    expect(await api.read("/shell")).toEqual({ _tag: "Problem", status: 500, says: "It did not answer" });
  });

  it("writes JSON, and names a path the way a read does", async () => {
    const { api, asked } = answering(200, { _tag: "Done", id: null, says: "Done", link: null });
    await api.write("/do", { doing: "work.add", values: {}, key: "k1" });
    expect(asked[0]?.init?.method).toBe("POST");
    expect(asked[0]?.url).toBe("/api/ws/acme/do");
    expect(api.url("acme", "/m/:manager/work/:work", { manager: "coding", work: "ACME-412" })).toBe("/api/ws/acme/m/coding/work/ACME-412");
  });
});
