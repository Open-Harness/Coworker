import { useCallback } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { createServer, each, Load, teamLinks, textOf, useLoading } from "./service.ts";
import type { Send } from "./types.ts";

afterEach(cleanup);

const answering =
  (body: unknown, status = 200): Send =>
  async () =>
    Response.json(body, { status });
const name = (body: unknown) => (typeof body === "object" && body !== null && "name" in body ? textOf(body.name) : undefined);

describe("the line to the server", () => {
  it("gives the narrowed value, the server's own words for a failure, or says the answer made no sense", async () => {
    expect(await createServer(answering({ name: "Acme" })).read("/x", name)).toEqual({ _tag: "Loaded", value: "Acme" });
    expect(await createServer(answering({ error: "No such workspace" }, 404)).read("/x", name)).toEqual({
      _tag: "Failed",
      message: "No such workspace",
    });
    expect(await createServer(answering({ _tag: "InvalidAddress", reason: "Too short" }, 400)).read("/x", name)).toEqual({
      _tag: "Failed",
      message: "Too short",
    });
    expect(await createServer(answering({ _tag: "HeldByAnother" }, 409)).read("/x", name)).toEqual({
      _tag: "Failed",
      message: "Held by another",
    });
    expect((await createServer(answering([])).read("/x", name))._tag).toBe("Failed");
    const away = createServer(() => Promise.reject(new Error("offline")));
    expect(await away.read("/x", name)).toEqual({ _tag: "Failed", message: "The server could not be reached" });
  });

  it("sends JSON with the method it was given, and no body when there is none", async () => {
    const sent: (RequestInit | undefined)[] = [];
    const server = createServer(async (_, init) => {
      sent.push(init);
      return Response.json({ name: "ok" });
    });
    await server.write("PUT", "/x", { on: true }, name);
    await server.write("DELETE", "/x", undefined, name);
    expect(sent.map((init) => [init?.method, init?.body])).toEqual([
      ["PUT", '{"on":true}'],
      ["DELETE", undefined],
    ]);
  });
});

describe("loading", () => {
  function Name({ send }: { readonly send: Send }) {
    const { loaded } = useLoading(useCallback(() => createServer(send).read("/x", name), [send]));
    return (
      <LayerProvider>
        <Load loaded={loaded} failedTitle="It did not load">
          {(value) => value}
        </Load>
      </LayerProvider>
    );
  }

  it("shows what loaded, and why when it did not", async () => {
    const view = render(<Name send={answering({ name: "Acme" })} />);
    expect(await screen.findByText("Acme")).toBeTruthy();
    view.rerender(<Name send={answering({ error: "Only an Owner can" }, 403)} />);
    expect(await screen.findByText("It did not load")).toBeTruthy();
    expect(screen.getByText("Only an Owner can")).toBeTruthy();
  });

  it("offers to try again on its own when it came from useLoading, and shows the content once that works", async () => {
    let up = false;
    const send: Send = async () => (up ? Response.json({ name: "Acme" }) : Response.json({ error: "Down" }, { status: 500 }));
    render(<Name send={send} />);
    expect(await screen.findByText("It did not load")).toBeTruthy();
    up = true;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Acme")).toBeTruthy();
  });
});

describe("a load that failed", () => {
  it("offers to ask again when it is given a way to", async () => {
    let asked = 0;
    render(
      <LayerProvider>
        <Load
          loaded={{ _tag: "Failed", message: "The server could not be reached" }}
          failedTitle="It did not load"
          onRetry={() => (asked += 1)}
        >
          {() => null}
        </Load>
      </LayerProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(asked).toBe(1);
  });

  it("puts a file's bytes as they are, with its own type", async () => {
    const sent: (RequestInit | undefined)[] = [];
    const server = createServer(async (_, init) => (sent.push(init), Response.json({ name: "ok" })));
    const file = new Blob(["png"], { type: "image/png" });
    expect(await server.upload("/logo", file, name)).toEqual({ _tag: "Loaded", value: "ok" });
    expect(sent[0]).toMatchObject({ method: "PUT", headers: { "content-type": "image/png" }, body: file });
  });
});

describe("addresses and narrowing", () => {
  it("encodes what it is given, and leaves malformed rows out", () => {
    expect(teamLinks.item("w1", "question:m1:a/b")).toBe("/ws/w1/inbox/question%3Am1%3Aa%2Fb");
    expect(teamLinks.mission("w1", "m1", "p 1")).toBe("/ws/w1/m/m1/mission?page=p%201");
    expect(each([{ id: "a" }, { id: 4 }, "no"], (row) => (typeof row["id"] === "string" ? row["id"] : undefined))).toEqual(["a"]);
  });
});
