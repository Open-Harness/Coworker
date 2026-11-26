import { describe, expect, it, vi } from "vitest";
import { PROTOCOL_VERSION } from "~/modules/protocol/service.ts";
import { connect } from "./service.ts";
import type { ConnectionStatus, SocketLike } from "./types.ts";

class FakeSocket implements SocketLike {
  readyState = 1;
  readonly sent: { type: string; requestId?: string }[] = [];
  readonly #listeners = new Map<string, (event: never) => void>();
  closedWith: number | undefined;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code?: number) {
    this.closedWith = code;
  }
  addEventListener(type: string, listener: (event: never) => void) {
    this.#listeners.set(type, listener);
  }
  emit(type: string, event: unknown = {}) {
    this.#listeners.get(type)?.(event as never);
  }
  receive(event: object) {
    this.emit("message", { data: JSON.stringify(event) });
  }
  start() {
    this.emit("open");
    this.receive({ type: "snapshot", protocol: PROTOCOL_VERSION });
  }
}

function setUp(onOpen: () => readonly object[] = () => []) {
  const socket = new FakeSocket();
  const statuses: ConnectionStatus[] = [];
  let mayReconnect: (code: number) => boolean = () => true;
  const connection = connect<{ type: string; requestId: string }, { type: string }>({
    open: (shouldReconnect) => ((mayReconnect = shouldReconnect), socket),
    parse: (text) => {
      const value = JSON.parse(text);
      return value.bad ? { ok: false, message: "bad" } : { ok: true, value };
    },
    onEvent: () => {},
    onStatus: (status) => statuses.push(status),
    onError: () => {},
    onOpen: onOpen as () => { type: string; requestId: string }[],
  });
  return { socket, statuses, connection, mayReconnect: (code: number) => mayReconnect(code) };
}
const done = (requestId: string | undefined) => ({ type: "command.result", requestId, ok: true, output: { kind: "done" } });

describe("a connection", () => {
  it("holds commands until the server's snapshot, then matches results", async () => {
    const { socket, connection, statuses } = setUp();
    const outcome = connection.send({ type: "go" });
    expect(socket.sent).toEqual([]);
    socket.start();
    expect(statuses).toEqual(["connected"]);
    socket.receive(done(socket.sent[0]?.requestId));
    await expect(outcome).resolves.toEqual({ type: "command.result", ok: true, output: { kind: "done" } });
  });

  it("sends a lasting command again with the same id, after what the page had open", async () => {
    const { socket, connection } = setUp(() => [{ type: "reopen", requestId: "x" }]);
    socket.start();
    const outcome = connection.send({ type: "go" });
    socket.emit("close", { code: 1006 });
    socket.start();
    expect(socket.sent.map(({ type }) => type)).toEqual(["reopen", "go", "reopen", "go"]);
    expect(socket.sent[1]).toEqual(socket.sent[3]);
    socket.receive(done(socket.sent[3]?.requestId));
    await expect(outcome).resolves.toMatchObject({ ok: true });
  });

  it("fails a passing command when the socket drops, and refuses one while offline", async () => {
    const { socket, connection } = setUp();
    await expect(connection.send({ type: "read" }, { lasting: false })).resolves.toMatchObject({ ok: false });
    socket.start();
    const outcome = connection.send({ type: "read" }, { lasting: false });
    socket.emit("close", { code: 1006 });
    await expect(outcome).resolves.toMatchObject({ ok: false, error: { code: "unavailable" } });
  });

  it("stops when the server says there is nothing here", async () => {
    const { socket, connection, statuses, mayReconnect } = setUp();
    socket.start();
    const waiting = connection.send({ type: "go" });
    socket.emit("close", { code: 4404 });
    expect(statuses.at(-1)).toBe("missing");
    expect(mayReconnect(1006)).toBe(false);
    await expect(waiting).resolves.toMatchObject({ ok: false });
  });

  it.each([
    ["a newer protocol", { type: "snapshot", protocol: PROTOCOL_VERSION + 1 }],
    ["an event it cannot read", { bad: true }],
  ])("asks for a reload on %s", (_name, event) => {
    const { socket, statuses } = setUp();
    socket.emit("open");
    socket.receive(event);
    expect(statuses).toEqual(["outdated"]);
    expect(socket.closedWith).toBe(1000);
  });

  it("settles everything once when closed", async () => {
    const { socket, connection } = setUp();
    const settled = vi.fn();
    void connection.send({ type: "go" }).then(settled);
    connection.close();
    connection.close();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
    expect(socket.closedWith).toBe(1000);
  });
});
