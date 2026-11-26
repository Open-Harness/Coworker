import { describe, expect, it } from "vitest";
import {
  FrameJoiner,
  LIMITS,
  newId,
  parseDirectoryCommand,
  parseDirectoryEvent,
  parseWorkspaceCommand,
  parseWorkspaceEvent,
  splitFrame,
} from "./service.ts";

const submit = { type: "prompt.submit", requestId: "r1", chatId: 2, content: "Hello", whenBusy: "followUp" };
const text = (value: unknown) => JSON.stringify(value);

describe("commands", () => {
  it("accepts a well-formed command", () => {
    expect(parseWorkspaceCommand(text(submit))).toEqual({ ok: true, value: submit });
  });

  it.each([
    ["no content", { ...submit, content: "  \n" }],
    ["an over-long prompt", { ...submit, content: "x".repeat(LIMITS.prompt + 1) }],
    ["a chat that is not a positive integer", { ...submit, chatId: 0 }],
    ["a missing request id", { ...submit, requestId: undefined }],
    ["an unknown field", { ...submit, admin: true }],
    ["an unknown type", { type: "prompt.steal", requestId: "r1" }],
    ["an unknown mode", { ...submit, whenBusy: "reject" }],
  ])("rejects %s", (_name, command) => {
    expect(parseWorkspaceCommand(text(command)).ok).toBe(false);
  });

  it("rejects what is not JSON, and a workspace id that is not a UUID", () => {
    expect(parseDirectoryCommand("{").ok).toBe(false);
    const create = { type: "workspace.create", requestId: "r1", name: "Team" };
    expect(parseDirectoryCommand(text({ ...create, workspaceId: "../directory" })).ok).toBe(false);
    expect(parseDirectoryCommand(text({ ...create, workspaceId: newId() })).ok).toBe(true);
  });
});

describe("events", () => {
  it("accepts fields a newer server added", () => {
    const event = { type: "people.changed", people: [{ id: "ts:a", name: "A", mood: "fine" }], later: 1 };
    expect(parseDirectoryEvent(text(event)).ok).toBe(true);
  });

  it("rejects an event whose payload has the wrong shape", () => {
    expect(parseWorkspaceEvent(text({ type: "chat.view", chatId: 1, view: {} })).ok).toBe(false);
    expect(parseWorkspaceEvent(text({ type: "command.result", requestId: "r", ok: true })).ok).toBe(false);
  });
});

describe("frames", () => {
  it("splits a message that is too long and joins it again", () => {
    const message = text({ value: "héllo ".repeat(50) });
    const frames = splitFrame(message, "m1", 64);
    expect(frames.length).toBeGreaterThan(3);
    expect(frames.every((frame) => frame.length < 100)).toBe(true);
    const joiner = new FrameJoiner();
    const joined = frames.map((frame) => joiner.push(frame));
    expect(joined.slice(0, -1).every((result) => result.ok && result.value === undefined)).toBe(true);
    expect(joined.at(-1)).toEqual({ ok: true, value: message });
  });

  it("passes short messages through and refuses pieces out of order", () => {
    const joiner = new FrameJoiner();
    expect(joiner.push("{}")).toEqual({ ok: true, value: "{}" });
    const [, second] = splitFrame("x".repeat(100), "m2", 40);
    expect(joiner.push(second!).ok).toBe(false);
  });

  it("keeps every split frame inside celld's 1 MiB message limit", () => {
    const [frame] = splitFrame("€".repeat(LIMITS.serverFrame * 2), newId(), LIMITS.serverFrame);
    expect(new TextEncoder().encode(frame).byteLength).toBeLessThan(1_048_576);
  });
});
