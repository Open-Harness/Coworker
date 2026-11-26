import { describe, expect, it } from "vitest";
import { createClock, createReads, entriesOf, locate, resolve } from "./service.ts";
import type { ScreenRoute } from "./types.ts";

const routes: Record<string, ScreenRoute | readonly ScreenRoute[]> = {
  "../screens/home/route.ts": { path: "/" },
  "../screens/signin/route.ts": { path: "/sign-in", outside: true },
  "../screens/playbook/route.ts": [
    { path: "/m/:manager/playbook" },
    { path: "/m/:manager/playbook/versions" },
    { path: "/m/:manager/playbook/:part" },
  ],
};
const entries = entriesOf(routes);
const at = (path: string) => resolve(entries, locate(path));

describe("page", () => {
  it("finds the page of an address, and the fixed part beats the open one", () => {
    expect(at("/ws/acme")?.entry.folder).toBe("home");
    expect(at("/ws/acme/m/sales/playbook/versions")?.entry.route.path).toBe("/m/:manager/playbook/versions");
    expect(at("/ws/acme/m/sales/playbook/triggers")?.params).toEqual({ manager: "sales", part: "triggers" });
    expect(at("/sign-in")?.entry.folder).toBe("signin");
  });

  it("does not offer a workspace page outside a workspace, or a door page inside one", () => {
    expect(at("/m/sales/playbook")).toBeUndefined();
    expect(at("/ws/acme/sign-in")).toBeUndefined();
    expect(at("/ws/acme/nothing")).toBeUndefined();
  });

  it("says a row's time the short way", () => {
    const now = Date.parse("2026-11-25T08:54:00Z");
    const clock = createClock(() => now, "Europe/Copenhagen");
    expect(clock.time(now)).toBe("09:54");
    expect([now - 3_600_000, now - 24 * 3_600_000, now - 3 * 86_400_000, now - 50 * 86_400_000].map(clock.short)).toEqual([
      "08:54",
      "Yesterday",
      "Sun",
      "6 Oct",
    ]);
  });

  it("asks a read once, however many watch it, and again when told what changed", async () => {
    let asked = 0;
    const send: typeof fetch = () => {
      asked += 1;
      return Promise.resolve(new Response(JSON.stringify({ inbox: asked }), { status: 200 }));
    };
    const reads = createReads(send);
    const seen: string[] = [];
    reads.watch("acme", "/shell", undefined, () => seen.push("one"));
    reads.watch("acme", "/shell", undefined, () => seen.push("two"));
    await new Promise((done) => setTimeout(done, 10));
    expect(asked).toBe(1);
    expect(reads.peek("acme", "/shell")).toEqual({ _tag: "Ok", value: { inbox: 1 } });
    reads.refresh("acme", ["/shell"]);
    await new Promise((done) => setTimeout(done, 10));
    expect(reads.peek("acme", "/shell")).toEqual({ _tag: "Ok", value: { inbox: 2 } });
    expect(seen).toHaveLength(4);
  });

  it("says a missing thing is gone, and a broken answer is failed", async () => {
    const send: typeof fetch = (input) =>
      Promise.resolve(new Response(JSON.stringify({ error: "no" }), { status: String(input).includes("/m/x") ? 404 : 500 }));
    const reads = createReads(send);
    reads.watch("acme", "/m/:manager", { manager: "x" }, () => undefined);
    reads.watch("acme", "/inbox", undefined, () => undefined);
    await new Promise((done) => setTimeout(done, 10));
    expect(reads.peek("acme", "/m/:manager", { manager: "x" })).toEqual({ _tag: "Gone" });
    expect(reads.peek("acme", "/inbox")).toEqual({ _tag: "Failed", says: "no", status: 500 });
  });
});
